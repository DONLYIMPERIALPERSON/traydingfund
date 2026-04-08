import json
import os
import queue
import subprocess
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List

import requests

BASE_FOLDER = os.path.dirname(os.path.abspath(__file__))
CONFIG_FOLDER = BASE_FOLDER

SETTINGS_PATH = os.path.join(BASE_FOLDER, "settings.json")
with open(SETTINGS_PATH, "r") as f:
    settings = json.load(f)

BACKEND_BASE_URL = settings["BACKEND_BASE_URL"].rstrip("/")
ENGINE_SECRET = settings["ENGINE_SECRET"]
BROKER_SERVER_NAME = settings.get("BROKER_SERVER_NAME")
MT5_TERMINALS = settings.get("MT5_TERMINALS", [])
POLL_INTERVAL_SECONDS = int(settings.get("POLL_INTERVAL_SECONDS", 10))
MAX_JOB_RUNTIME_SECONDS = int(settings.get("MAX_JOB_RUNTIME_SECONDS", 120))
LOOKBACK_MINUTES = int(settings.get("LOOKBACK_MINUTES", 60))
TIMER_SECONDS = int(settings.get("TIMER_SECONDS", 2))
ACCOUNT_CHECK_INTERVAL_SECONDS = int(settings.get("ACCOUNT_CHECK_INTERVAL_SECONDS", 300))
ACTIVE_ACCOUNTS_CACHE_FILE = os.path.join(BASE_FOLDER, "active_accounts.json")
COMMON_FILES_DIR = os.path.join(
    os.environ.get("APPDATA", ""),
    "MetaQuotes",
    "Terminal",
    "Common",
    "Files",
)


def fetch_active_mt5_accounts() -> List[Dict[str, str]]:
    url = f"{BACKEND_BASE_URL}/mt5/active-accounts"
    headers = {"X-ENGINE-SECRET": ENGINE_SECRET}
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    accounts = response.json()
    return [acct for acct in accounts if str(acct.get("platform", "")).lower() == "mt5"]


def build_config_file(account: Dict[str, str], mt5_path: str, job_id: str) -> str:
    account_number = account.get("accountNumber")
    login = account.get("mt5Login") or account_number
    password = account.get("mt5Password")
    server = account.get("mt5Server") or BROKER_SERVER_NAME

    config_file = os.path.join(CONFIG_FOLDER, f"config_{account_number}_{job_id}.ini")
    with open(config_file, "w") as f:
        f.write("[Common]\n")
        f.write("EnableAutoTrading=1\n")
        f.write(f"Login={login}\n")
        f.write(f"Password={password}\n")
        f.write(f"Server={server}\n")
        f.write("[StartUp]\n")
        f.write("Expert=MT5MetricsEA\n")
        f.write("Symbol=EURUSDm\n")
        f.write("Period=H1\n")
        f.write("Template=metrics.tpl\n")
        f.write("[Experts]\n")
        f.write("AllowDllImports=true\n")
        f.write("AllowWebRequest=true\n")
        f.write("[Experts\\MT5MetricsEA]\n")
        f.write(f"ENGINE_SECRET={ENGINE_SECRET}\n")
        f.write(f"LOOKBACK_MINUTES={LOOKBACK_MINUTES}\n")
        f.write(f"TIMER_SECONDS={TIMER_SECONDS}\n")

    return config_file


def run_mt5_job(account: Dict[str, str], mt5_path: str) -> Dict[str, str]:
    account_number = account.get("accountNumber")
    job_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")

    config_file = build_config_file(account, mt5_path, job_id)

    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = 6  # SW_MINIMIZE

    process = subprocess.Popen(
        [mt5_path, "/portable", f"/config:{config_file}"],
        startupinfo=startupinfo
    )

    start_time = time.time()
    while True:
        retcode = process.poll()
        if retcode is not None:
            break
        if time.time() - start_time > MAX_JOB_RUNTIME_SECONDS:
            try:
                process.terminate()
                time.sleep(2)
                if process.poll() is None:
                    process.kill()
            except Exception:
                pass
            break
        time.sleep(1)

    if os.path.exists(config_file):
        try:
            os.remove(config_file)
        except Exception:
            pass

    close_config = os.path.join(CONFIG_FOLDER, f"config_{account_number}_{job_id}_close.ini")
    try:
        with open(close_config, "w") as f:
            f.write("[StartUp]\n")
            f.write("Symbol=EURUSDm\n")
            f.write("Period=H1\n")
            f.write("AutoClose=1\n")
        subprocess.Popen(
            [mt5_path, "/portable", f"/config:{close_config}"],
            startupinfo=startupinfo
        )
        time.sleep(3)
    except Exception:
        pass
    if os.path.exists(close_config):
        try:
            os.remove(close_config)
        except Exception:
            pass

    return {
        "account": str(account_number),
        "status": "sent",
        "job_id": job_id,
    }


def send_metrics_from_file(account_number: str) -> None:
    filename = f"metrics_{account_number}.json"
    file_path = os.path.join(COMMON_FILES_DIR, filename)

    if not os.path.exists(file_path):
        return

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            payload = json.load(file)
    except Exception as exc:
        print(f"[mt5-manager] Failed reading metrics file {filename}: {exc}")
        return

    try:
        headers = {"X-ENGINE-SECRET": ENGINE_SECRET}
        url = f"{BACKEND_BASE_URL}/mt5/metrics"
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        print(f"[mt5-manager] Sent metrics for {account_number} -> {response.status_code}")
        if response.status_code == 200:
            os.remove(file_path)
    except Exception as exc:
        print(f"[mt5-manager] Error sending metrics for {account_number}: {exc}")


def run_mt5_job_and_stamp(account: Dict[str, str], mt5_path: str, index: int, cache: List[Dict[str, str]], lock: threading.Lock) -> None:
    run_mt5_job(account, mt5_path)
    send_metrics_from_file(str(account.get("accountNumber")))
    with lock:
        cache[index] = stamp_last_checked(account)


def load_active_cache() -> List[Dict[str, str]]:
    if not os.path.exists(ACTIVE_ACCOUNTS_CACHE_FILE):
        return []
    try:
        with open(ACTIVE_ACCOUNTS_CACHE_FILE, "r") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
    except Exception:
        return []
    return []


def save_active_cache(cache: List[Dict[str, str]]) -> None:
    try:
        with open(ACTIVE_ACCOUNTS_CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception:
        pass


def merge_active_accounts(
    current_accounts: List[Dict[str, str]],
    latest_accounts: List[Dict[str, str]],
) -> List[Dict[str, str]]:
    latest_by_number: Dict[str, Dict[str, str]] = {}
    for account in latest_accounts:
        number = str(account.get("accountNumber"))
        if not number:
            continue
        existing = next(
            (a for a in current_accounts if str(a.get("accountNumber")) == number),
            {},
        )
        latest_by_number[number] = {
            **account,
            "last_checked_at": existing.get("last_checked_at"),
        }

    latest_order = [
        str(account.get("accountNumber"))
        for account in latest_accounts
        if account.get("accountNumber")
    ]

    existing_numbers = [
        str(account.get("accountNumber"))
        for account in current_accounts
        if account.get("accountNumber") and str(account.get("accountNumber")) in latest_by_number
    ]

    new_numbers = [number for number in latest_order if number not in existing_numbers]
    next_numbers = existing_numbers + new_numbers

    return [latest_by_number[number] for number in next_numbers if number in latest_by_number]


def stamp_last_checked(account: Dict[str, str]) -> Dict[str, str]:
    return {
        **account,
        "last_checked_at": datetime.utcnow().isoformat() + "Z",
    }


def should_check_account(account: Dict[str, str]) -> bool:
    last_checked_at = account.get("last_checked_at")
    if not last_checked_at:
        return True
    try:
        timestamp = last_checked_at.replace("Z", "+00:00")
        last_checked = datetime.fromisoformat(timestamp)
    except Exception:
        return True
    elapsed_seconds = (datetime.now(timezone.utc) - last_checked).total_seconds()
    return elapsed_seconds >= ACCOUNT_CHECK_INTERVAL_SECONDS


def build_job_queue(active_cache: List[Dict[str, str]]) -> queue.Queue:
    job_queue: queue.Queue = queue.Queue()
    for index, account in enumerate(active_cache):
        if not account.get("accountNumber"):
            continue
        if not should_check_account(account):
            continue
        job_queue.put({"index": index, "account": account})
    return job_queue


def worker_loop(
    worker_id: int,
    mt5_path: str,
    job_queue: queue.Queue,
    cache: List[Dict[str, str]],
    lock: threading.Lock,
) -> None:
    while True:
        try:
            job = job_queue.get_nowait()
        except queue.Empty:
            break

        try:
            run_mt5_job_and_stamp(job["account"], mt5_path, job["index"], cache, lock)
        finally:
            job_queue.task_done()


def run_loop() -> None:
    if not MT5_TERMINALS:
        raise RuntimeError("No MT5 terminals configured in settings.json")

    active_cache: List[Dict[str, str]] = load_active_cache()
    terminal_index = 0

    while True:
        try:
            accounts = fetch_active_mt5_accounts()
            active_cache = merge_active_accounts(active_cache, accounts)

            save_active_cache(active_cache)

            job_queue = build_job_queue(active_cache)
            lock = threading.Lock()

            threads: List[threading.Thread] = []
            for offset, mt5_path in enumerate(MT5_TERMINALS):
                thread = threading.Thread(
                    target=worker_loop,
                    args=(offset, mt5_path, job_queue, active_cache, lock),
                    daemon=True,
                )
                threads.append(thread)
                thread.start()

            for thread in threads:
                thread.join()

            terminal_index = (terminal_index + len(MT5_TERMINALS)) % max(len(MT5_TERMINALS), 1)

            save_active_cache(active_cache)

            time.sleep(POLL_INTERVAL_SECONDS)
        except Exception as exc:
            print(f"[mt5-manager] loop error: {exc}")
            time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_loop()

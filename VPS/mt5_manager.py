import json
import os
import subprocess
import time
from datetime import datetime
from typing import Dict, List, Optional

import requests

BASE_FOLDER = os.path.dirname(os.path.abspath(__file__))
CONFIG_FOLDER = BASE_FOLDER

SETTINGS_PATH = os.path.join(BASE_FOLDER, "settings.json")
with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
    settings = json.load(f)

REPLAY_BASE_URL = settings["REPLAY_BASE_URL"].rstrip("/")
REPLAY_ENDPOINT = settings.get("REPLAY_ENDPOINT", "/replay/ea")
MT5_TERMINALS = settings.get("MT5_TERMINALS", [])
POLL_INTERVAL_SECONDS = int(settings.get("POLL_INTERVAL_SECONDS", 10))
MAX_JOB_RUNTIME_SECONDS = int(settings.get("MAX_JOB_RUNTIME_SECONDS", 120))
LOOKBACK_MINUTES = int(settings.get("LOOKBACK_MINUTES", 60))
TIMER_SECONDS = int(settings.get("TIMER_SECONDS", 2))
ACCOUNTS_FILE = os.path.join(BASE_FOLDER, settings.get("ACCOUNTS_FILE", "accounts.json"))
BACKEND_BASE_URL = settings.get("BACKEND_BASE_URL", "").rstrip("/")
BACKEND_ACTIVE_ACCOUNTS_ENDPOINT = settings.get("BACKEND_ACTIVE_ACCOUNTS_ENDPOINT", "/v1/mt5/active-accounts")
BACKEND_ENGINE_SECRET = settings.get("BACKEND_ENGINE_SECRET", "")
SYNC_INTERVAL_SECONDS = int(settings.get("SYNC_INTERVAL_SECONDS", 30))
COMMON_FILES_DIR = os.path.join(
    os.environ.get("APPDATA", ""),
    "MetaQuotes",
    "Terminal",
    "Common",
    "Files",
)


def load_accounts() -> List[Dict[str, str]]:
    if not os.path.exists(ACCOUNTS_FILE):
        return []
    with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        return []
    return [acct for acct in data if isinstance(acct, dict)]


def save_accounts(accounts: List[Dict[str, str]]) -> None:
    try:
        with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f:
            json.dump(accounts, f, indent=2)
    except Exception as exc:
        print(f"[replay-mt5] Failed to write accounts.json: {exc}")


def fetch_active_accounts() -> List[Dict[str, str]]:
    if not BACKEND_BASE_URL:
        return []
    try:
        headers = {}
        if BACKEND_ENGINE_SECRET:
            headers["X-ENGINE-SECRET"] = BACKEND_ENGINE_SECRET
        response = requests.get(
            f"{BACKEND_BASE_URL}{BACKEND_ACTIVE_ACCOUNTS_ENDPOINT}",
            headers=headers,
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, list):
            return payload
    except Exception as exc:
        print(f"[replay-mt5] Failed to fetch active accounts: {exc}")
    return []


def build_config_file(account: Dict[str, str], mt5_path: str, job_id: str) -> str:
    account_number = account.get("accountNumber")
    login = account.get("mt5Login") or account_number
    password = account.get("mt5Password")
    server = account.get("mt5Server")

    config_file = os.path.join(CONFIG_FOLDER, f"config_{account_number}_{job_id}.ini")
    with open(config_file, "w", encoding="utf-8") as f:
        f.write("[Common]\n")
        f.write("EnableAutoTrading=1\n")
        f.write(f"Login={login}\n")
        f.write(f"Password={password}\n")
        f.write(f"Server={server}\n")
        f.write("[StartUp]\n")
        f.write("Expert=ReplayMetricsEA\n")
        f.write("Symbol=EURUSDm\n")
        f.write("Period=H1\n")
        f.write("Template=replay.tpl\n")
        f.write("[Experts]\n")
        f.write("AllowDllImports=true\n")
        f.write("AllowWebRequest=true\n")
        f.write("[Experts\\ReplayMetricsEA]\n")
        f.write(f"REPLAY_URL={REPLAY_BASE_URL}{REPLAY_ENDPOINT}\n")
        f.write(f"LOOKBACK_MINUTES={LOOKBACK_MINUTES}\n")
        f.write(f"TIMER_SECONDS={TIMER_SECONDS}\n")

    return config_file


def start_mt5_job(account: Dict[str, str], mt5_path: str) -> Dict[str, object]:
    account_number = account.get("accountNumber")
    job_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    metrics_file = os.path.join(COMMON_FILES_DIR, f"metrics_{account_number}.json")
    initial_mtime = os.path.getmtime(metrics_file) if os.path.exists(metrics_file) else None

    config_file = build_config_file(account, mt5_path, job_id)

    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = 6

    process = subprocess.Popen(
        [mt5_path, "/portable", f"/config:{config_file}"],
        startupinfo=startupinfo,
    )

    return {
        "account": str(account_number),
        "account_meta": account,
        "mt5_path": mt5_path,
        "process": process,
        "config_file": config_file,
        "metrics_file": metrics_file,
        "initial_mtime": initial_mtime,
        "started_at": time.time(),
        "job_id": job_id,
    }


def cleanup_config_file(config_file: str) -> None:
    if os.path.exists(config_file):
        try:
            os.remove(config_file)
        except Exception:
            pass


def finalize_mt5_job(job: Dict[str, object]) -> Dict[str, object]:
    account_number = str(job.get("account"))
    metrics_file = str(job.get("metrics_file"))
    initial_mtime = job.get("initial_mtime")
    config_file = str(job.get("config_file"))

    cleanup_config_file(config_file)

    updated_mtime = os.path.getmtime(metrics_file) if os.path.exists(metrics_file) else None
    metrics_updated = updated_mtime is not None and updated_mtime != initial_mtime

    return {
        "account": account_number,
        "status": "sent",
        "job_id": str(job.get("job_id")),
        "metrics_updated": metrics_updated,
    }


def stop_expired_job(job: Dict[str, object]) -> bool:
    process = job.get("process")
    started_at = float(job.get("started_at") or 0)
    if not isinstance(process, subprocess.Popen):
        return True

    if process.poll() is not None:
        return True

    if time.time() - started_at <= MAX_JOB_RUNTIME_SECONDS:
        return False

    try:
        process.terminate()
        time.sleep(2)
        if process.poll() is None:
            process.kill()
    except Exception:
        pass
    return True


def collect_finished_jobs(active_jobs: Dict[str, Dict[str, object]]) -> List[Dict[str, object]]:
    finished: List[Dict[str, object]] = []
    for terminal_path, job in list(active_jobs.items()):
        process = job.get("process")
        should_finalize = False
        if isinstance(process, subprocess.Popen) and process.poll() is not None:
            should_finalize = True
        elif stop_expired_job(job):
            should_finalize = True

        if should_finalize:
            finished.append(job)
            active_jobs.pop(terminal_path, None)

    return finished


def get_due_accounts(
    accounts: List[Dict[str, str]],
    last_processed_at: Dict[str, float],
    active_account_numbers: set[str],
) -> List[Dict[str, str]]:
    now = time.time()
    due_accounts: List[Dict[str, str]] = []
    for account in accounts:
        if str(account.get("platform", "")).lower() != "mt5":
            continue

        account_number = str(account.get("accountNumber") or "")
        if not account_number or account_number in active_account_numbers:
            continue

        last_seen = last_processed_at.get(account_number, 0)
        if now - last_seen >= 60:
            due_accounts.append(account)

    return due_accounts


def send_metrics_from_file(account_number: str, account_meta: Dict[str, str] | None = None) -> None:
    filename = f"metrics_{account_number}.json"
    file_path = os.path.join(COMMON_FILES_DIR, filename)

    if not os.path.exists(file_path):
        return

    try:
        with open(file_path, "r", encoding="latin-1") as file:
            payload = json.load(file)
    except Exception as exc:
        print(f"[replay-mt5] Failed reading metrics file {filename}: {exc}")
        return

    try:
        payload_account = str(payload.get("account_number") or "")
        current_balance = float(payload.get("current_balance"))
        current_equity = float(payload.get("current_equity"))
    except Exception:
        print(f"[replay-mt5] Skipping metrics send for {account_number}; invalid payload structure")
        return

    if payload_account != str(account_number):
        print(
            f"[replay-mt5] Skipping metrics send for {account_number}; "
            f"payload account mismatch ({payload_account})"
        )
        return

    if current_balance <= 0 or current_equity <= 0:
        print(
            f"[replay-mt5] Skipping metrics send for {account_number}; "
            f"invalid snapshot balance={current_balance} equity={current_equity}"
        )
        return

    if account_meta:
        payload["account_type"] = account_meta.get("accountType") or account_meta.get("account_type")
        raw_size = account_meta.get("accountSize") or account_meta.get("account_size")
        if raw_size is not None:
            if isinstance(raw_size, str):
                cleaned = raw_size.replace("$", "").replace("₦", "").replace(",", "").strip()
                try:
                    payload["account_size"] = float(cleaned)
                except ValueError:
                    payload["account_size"] = raw_size
            else:
                payload["account_size"] = raw_size

    try:
        url = f"{REPLAY_BASE_URL}{REPLAY_ENDPOINT}"
        response = requests.post(url, json=payload, timeout=15)
        print(f"[replay-mt5] Sent metrics for {account_number} -> {response.status_code}")
        if response.status_code != 200:
            try:
                print(f"[replay-mt5] Replay response body: {response.text}")
            except Exception:
                pass
        if response.status_code == 200:
            os.remove(file_path)
    except Exception as exc:
        print(f"[replay-mt5] Error sending metrics for {account_number}: {exc}")


def run_loop() -> None:
    if not MT5_TERMINALS:
        raise RuntimeError("No MT5 terminals configured in settings.json")

    last_processed_at: Dict[str, float] = {}
    last_sync_at = 0.0
    active_jobs: Dict[str, Dict[str, object]] = {}
    while True:
        try:
            now = time.time()

            finished_jobs = collect_finished_jobs(active_jobs)
            for job in finished_jobs:
                account_number = str(job.get("account"))
                account_meta = job.get("account_meta")
                job_result = finalize_mt5_job(job)
                if job_result.get("metrics_updated"):
                    send_metrics_from_file(account_number, account_meta if isinstance(account_meta, dict) else None)
                else:
                    print(f"[replay-mt5] Skipping metrics send for {account_number}; metrics file not updated")
                last_processed_at[account_number] = time.time()

            if now - last_sync_at >= SYNC_INTERVAL_SECONDS:
                active_accounts = fetch_active_accounts()
                if active_accounts:
                    save_accounts(active_accounts)
                last_sync_at = now

            accounts = load_accounts()
            if not accounts:
                print("[replay-mt5] No accounts found in accounts.json")
                time.sleep(POLL_INTERVAL_SECONDS)
                continue

            active_account_numbers = {
                str(job.get("account"))
                for job in active_jobs.values()
                if job.get("account") is not None
            }
            due_accounts = get_due_accounts(accounts, last_processed_at, active_account_numbers)

            for mt5_path in MT5_TERMINALS:
                if mt5_path in active_jobs:
                    continue
                if not due_accounts:
                    break

                account = due_accounts.pop(0)
                account_number = str(account.get("accountNumber"))
                active_jobs[mt5_path] = start_mt5_job(account, mt5_path)
                print(f"[replay-mt5] Started MT5 job for {account_number} on {mt5_path}")

            time.sleep(POLL_INTERVAL_SECONDS)
        except Exception as exc:
            print(f"[replay-mt5] loop error: {exc}")
            time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_loop()
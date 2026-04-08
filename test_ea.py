import subprocess
import time
import os
import json
import glob

# === PATHS ===
MT5_PATH = r"C:\mt5-test\terminal_TEST\terminal64.exe"
CONFIG_PATH = r"C:\mt5-test\test_config.ini"

COMMON_FILES_DIR = os.path.join(
    os.environ.get("APPDATA", ""),
    "MetaQuotes",
    "Terminal",
    "Common",
    "Files",
)

TERMINAL_ROOT = os.path.join(
    os.environ.get("APPDATA", ""),
    "MetaQuotes",
    "Terminal",
)

# === LOGIN ===
LOGIN = "435282436"
PASSWORD = "WQw5!h@a1W0C"
SERVER = "Exness-MT5Trial9"

# === CREATE CONFIG ===
with open(CONFIG_PATH, "w") as f:
    f.write(f"""
[Common]
EnableAutoTrading=1
Login={LOGIN}
Password={PASSWORD}
Server={SERVER}

[StartUp]
Expert=MT5MetricsEA_TEST
Symbol=EURUSDm
Period=H1
Template=metrics.tpl

[Experts]
AllowDllImports=true
AllowWebRequest=true
""" + f"""
[Experts\\MT5MetricsEA_TEST]
ENGINE_SECRET=dev-mt5-secret
LOOKBACK_MINUTES=60
TIMER_SECONDS=2
""")

print("Starting MT5 test...")

# === RUN MT5 (same as production) ===
process = subprocess.Popen(
    [MT5_PATH, "/portable", f"/config:{CONFIG_PATH}"]
)

# Wait for EA to run
time.sleep(60)

# Kill MT5
process.terminate()

print("MT5 closed.")

# === READ METRICS FILE (REAL SOURCE) ===
filename = f"metrics_{LOGIN}.json"
file_path = os.path.join(COMMON_FILES_DIR, filename)

print("\n=== EA OUTPUT ===\n")

if os.path.exists(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        print(json.dumps(data, indent=2))
else:
    print("❌ No metrics file found in Common\\Files. Searching terminal data folders...")
    print("Terminal root:", TERMINAL_ROOT)
    fallback_paths = glob.glob(
        os.path.join(TERMINAL_ROOT, "*", "MQL5", "Files", filename)
    )
    if not fallback_paths:
        fallback_paths = glob.glob(
            os.path.join(TERMINAL_ROOT, "*", "Common", "Files", filename)
        )

    if not fallback_paths:
        print("❌ No metrics file found in terminal data folders.")
    else:
        print("✅ Found metrics file at:")
        for path in fallback_paths:
            print("-", path)
        with open(fallback_paths[0], "r", encoding="utf-8") as f:
            data = json.load(f)
            print(json.dumps(data, indent=2))

print("\n=== JOURNAL LOG (latest) ===\n")
journal_paths = glob.glob(
    os.path.join(TERMINAL_ROOT, "*", "MQL5", "Logs", "*.log")
)
if not journal_paths:
    print("No journal logs found.")
else:
    latest_log = max(journal_paths, key=os.path.getmtime)
    print("Journal:", latest_log)
    try:
        with open(latest_log, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()[-200:]
        print("".join(lines))
    except Exception as exc:
        print("Failed to read journal:", exc)

print("\n=== END ===")
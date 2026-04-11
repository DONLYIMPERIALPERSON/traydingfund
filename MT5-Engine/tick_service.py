import json
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request

TICK_DIR = Path("C:/tick-data")
CACHE_TTL_SECONDS = 3600

cache_store: dict[str, tuple[float, list[dict]]] = {}

app = FastAPI()
read_app = FastAPI()

# =========================
# HELPERS
# =========================
def safe_symbol(symbol: str) -> str:
    return "".join(ch for ch in symbol.upper() if ch.isalnum())


def day_key(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def file_path(symbol: str, day: str) -> Path:
    return TICK_DIR / safe_symbol(symbol) / f"{day}.json"


def cache_key(symbol: str, day: str) -> str:
    return f"ticks:{safe_symbol(symbol)}:{day}"


def load(symbol: str, day: str):
    f = file_path(symbol, day)
    if not f.exists():
        return []
    return json.loads(f.read_text())


def save(symbol: str, day: str, ticks):
    f = file_path(symbol, day)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(ticks, separators=(",", ":")))


def cache_ticks(symbol: str, day: str, ticks: list[dict]) -> None:
    cache_store[cache_key(symbol, day)] = (time.time() + CACHE_TTL_SECONDS, ticks)


def load_cached(symbol: str, day: str) -> list[dict]:
    cached = cache_store.get(cache_key(symbol, day))
    if not cached:
        return []
    expires_at, ticks = cached
    if expires_at < time.time():
        cache_store.pop(cache_key(symbol, day), None)
        return []
    return ticks


def purge_old():
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)

    if not TICK_DIR.exists():
        return

    for sym in TICK_DIR.iterdir():
        if not sym.is_dir():
            continue

        for file in sym.glob("*.json"):
            try:
                d = datetime.strptime(file.stem, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if d < cutoff:
                    file.unlink()
            except Exception:
                pass


# =========================
# ENDPOINTS
# =========================
@app.post("/submit_ticks")
async def submit_ticks(request: Request):
    raw = await request.body()

    try:
        payload = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    symbol = payload.get("symbol")
    ticks = payload.get("ticks", [])

    if not symbol or not isinstance(ticks, list):
        raise HTTPException(status_code=400, detail="Bad payload")

    grouped = {}

    for t in ticks:
        if "time" not in t:
            continue

        t_ms = int(t["time"])
        d = day_key(t_ms)

        grouped.setdefault(d, []).append({
            "time": t_ms,
            "bid": float(t.get("bid")),
            "ask": float(t.get("ask"))
        })

    for d, new_ticks in grouped.items():
        cached_ticks = load_cached(symbol, d)
        existing = cached_ticks if cached_ticks else load(symbol, d)

        existing_map = {t["time"]: t for t in existing}

        for nt in new_ticks:
            existing_map[nt["time"]] = nt

        combined = list(existing_map.values())
        combined.sort(key=lambda x: x["time"])

        save(symbol, d, combined)
        cache_ticks(symbol, d, combined)

    purge_old()

    return {"status": "ok"}


@read_app.get("/get_ticks")
async def get_ticks(symbol: str, start: int, end: int):
    if end < start:
        raise HTTPException(status_code=400)

    result = []

    current = datetime.fromtimestamp(start / 1000, tz=timezone.utc)
    end_dt = datetime.fromtimestamp(end / 1000, tz=timezone.utc)

    while current <= end_dt:
        d = current.strftime("%Y-%m-%d")
        cached_ticks = load_cached(symbol, d)
        ticks = cached_ticks if cached_ticks else load(symbol, d)
        if not cached_ticks:
            cache_ticks(symbol, d, ticks)

        for t in ticks:
            if start <= t["time"] <= end:
                result.append(t)

        current += timedelta(days=1)

    return result


@app.get("/health")
async def health():
    return {"status": "ok"}


@read_app.get("/health")
async def read_health():
    return {"status": "ok"}


# =========================
# RUN
# =========================
if __name__ == "__main__":
    import uvicorn

    submit_server = threading.Thread(
        target=lambda: uvicorn.run(app, host="0.0.0.0", port=8200),
        daemon=True,
    )
    submit_server.start()
    uvicorn.run(read_app, host="0.0.0.0", port=8201)
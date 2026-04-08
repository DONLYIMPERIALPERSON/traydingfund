import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

BASE_DIR = Path(__file__).resolve().parent
TICK_DIR = Path("C:/tick-data")

app = FastAPI()


def _safe_symbol(symbol: str) -> str:
    return "".join(ch for ch in symbol.upper() if ch.isalnum() or ch in ("_", "-"))


def _day_key_from_ms(ms: int) -> str:
    dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d")


def _tick_file(symbol: str, day_key: str) -> Path:
    safe_symbol = _safe_symbol(symbol)
    return TICK_DIR / safe_symbol / f"{day_key}.json"


def _ensure_dirs(symbol: str) -> None:
    (TICK_DIR / _safe_symbol(symbol)).mkdir(parents=True, exist_ok=True)


def _load_ticks(symbol: str, day_key: str) -> list[dict]:
    path = _tick_file(symbol, day_key)
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_ticks(symbol: str, day_key: str, ticks: list[dict]) -> None:
    path = _tick_file(symbol, day_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(ticks, f, separators=(",", ":"))


def _purge_old_days(days_to_keep: int = 1) -> None:
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=days_to_keep)
    if not TICK_DIR.exists():
        return
    for symbol_dir in TICK_DIR.iterdir():
        if not symbol_dir.is_dir():
            continue
        for file in symbol_dir.glob("*.json"):
            try:
                day = datetime.strptime(file.stem, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            if day < cutoff:
                file.unlink(missing_ok=True)


@app.post("/submit_ticks")
async def submit_ticks(payload: dict):
    symbol = payload.get("symbol")
    ticks = payload.get("ticks", [])

    if not symbol:
        raise HTTPException(status_code=400, detail="Missing symbol")
    if not isinstance(ticks, list):
        raise HTTPException(status_code=400, detail="Ticks must be a list")

    _ensure_dirs(symbol)

    for tick in ticks:
        if "time_msc" not in tick:
            if "time" in tick:
                tick["time_msc"] = tick["time"]
            else:
                continue

    grouped: dict[str, list[dict]] = {}
    for tick in ticks:
        if "time_msc" not in tick:
            print("Skipping tick, no time_msc:", tick)
            continue
        day_key = _day_key_from_ms(int(tick["time_msc"]))
        grouped.setdefault(day_key, []).append(tick)

    total_added = 0
    for day_key, day_ticks in grouped.items():
        existing = _load_ticks(symbol, day_key)
        combined = existing + day_ticks
        combined.sort(key=lambda x: int(x.get("time_msc", 0)))
        _save_ticks(symbol, day_key, combined)
        total_added += len(day_ticks)

    _purge_old_days(days_to_keep=1)

    return {"status": "ok", "symbol": symbol, "added": total_added}


@app.get("/get_ticks")
async def get_ticks(
    symbol: str,
    start: int = Query(..., description="Start time in ms"),
    end: int = Query(..., description="End time in ms"),
):
    if end < start:
        raise HTTPException(status_code=400, detail="end must be >= start")

    result = []
    start_dt = datetime.fromtimestamp(start / 1000, tz=timezone.utc)
    end_dt = datetime.fromtimestamp(end / 1000, tz=timezone.utc)

    current = start_dt
    while current <= end_dt:
        day_key = current.strftime("%Y-%m-%d")
        ticks = _load_ticks(symbol, day_key)
        for t in ticks:
            t_ms = int(t.get("time_msc", 0))
            if start <= t_ms <= end:
                result.append({
                    "time": t_ms,
                    "bid": t.get("bid"),
                    "ask": t.get("ask"),
                })
        current += timedelta(days=1)

    return result


@app.post("/symbols/day")
async def symbols_day(payload: dict):
    date = payload.get("date")
    symbols = payload.get("symbols", [])
    if not date:
        raise HTTPException(status_code=400, detail="Missing date")
    if not isinstance(symbols, list):
        raise HTTPException(status_code=400, detail="symbols must be a list")

    path = TICK_DIR / "symbols"
    path.mkdir(parents=True, exist_ok=True)
    with (path / f"{date}.json").open("w", encoding="utf-8") as f:
        json.dump({"date": date, "symbols": symbols}, f, separators=(",", ":"))

    return {"status": "ok", "date": date, "count": len(symbols)}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8200)
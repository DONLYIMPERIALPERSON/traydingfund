from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

TICK_DIR = Path("C:/tick-data")
CACHE_TTL_SECONDS = 3600

cache_store: dict[str, tuple[float, list[dict]]] = {}


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


def purge_old() -> None:
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
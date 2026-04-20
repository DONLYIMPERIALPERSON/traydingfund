from __future__ import annotations

from datetime import datetime, timedelta, timezone
import os

from fastapi import FastAPI, HTTPException
import uvicorn
from dotenv import load_dotenv

from tick_service_common import cache_ticks, load, load_cached

load_dotenv()

app = FastAPI()

READ_HOST = os.environ.get("TICK_READ_HOST", "0.0.0.0")
READ_PORT = int(os.environ.get("TICK_READ_PORT", "8201"))
READ_WORKERS = max(1, int(os.environ.get("TICK_READ_WORKERS", "1")))


@app.get("/get_ticks")
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


if __name__ == "__main__":
    uvicorn.run("tick_read_service:app", host=READ_HOST, port=READ_PORT, workers=READ_WORKERS)
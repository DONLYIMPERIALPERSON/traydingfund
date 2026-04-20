from __future__ import annotations

import json
import os

from fastapi import FastAPI, HTTPException, Request
import uvicorn
from dotenv import load_dotenv

from tick_service_common import cache_ticks, day_key, load, load_cached, purge_old, save

load_dotenv()

app = FastAPI()

WRITE_HOST = os.environ.get("TICK_WRITE_HOST", "0.0.0.0")
WRITE_PORT = int(os.environ.get("TICK_WRITE_PORT", "8200"))


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
            "ask": float(t.get("ask")),
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


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("tick_write_service:app", host=WRITE_HOST, port=WRITE_PORT)
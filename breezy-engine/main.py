from __future__ import annotations

import json
import os
import time
from datetime import datetime
from pathlib import Path
from threading import Event, Lock, Thread
from typing import Dict, List, Optional
from uuid import uuid4

import redis
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Breezy Replay Engine", version="0.1.0")

TICK_SERVICE_URL = os.environ.get("TICK_SERVICE_URL", "http://15.237.52.163:8201")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
BREEZY_REPLAY_QUEUE_KEY = os.environ.get("BREEZY_REPLAY_QUEUE_KEY", "mf:breezy:replay:queue")
BREEZY_REPLAY_SESSION_PREFIX = os.environ.get("BREEZY_REPLAY_SESSION_PREFIX", "mf:breezy:replay:session:")
BREEZY_REPLAY_LATEST_SESSION_PREFIX = os.environ.get("BREEZY_REPLAY_LATEST_SESSION_PREFIX", "mf:breezy:replay:latest:")
BREEZY_REPLAY_WORKER_COUNT = max(1, int(os.environ.get("BREEZY_REPLAY_WORKER_COUNT", "2")))
BACKEND_BREEZY_METRICS_URL = os.environ.get("BACKEND_BREEZY_METRICS_URL", "")
BACKEND_ENGINE_SECRET = os.environ.get("BACKEND_ENGINE_SECRET", "")

EVENT_ORDER = {"open": 0, "deal": 1, "tick": 2}
SUPPORTED_MARKET_SYMBOLS = {
    "EURUSDm", "GBPUSDm", "AUDUSDm", "NZDUSDm", "USDJPYm", "USDCADm", "USDCHFm",
    "EURGBPm", "EURJPYm", "GBPJPYm", "AUDJPYm", "NZDJPYm", "EURCHFm", "GBPCHFm", "CADJPYm", "CHFJPYm", "EURAUDm", "XAUUSDm", "XAGUSDm", "XPTUSDm",
    "US30m", "US500m", "USTECm", "UK100m", "DE30m", "FRA40m", "JP225m", "BTCUSDm", "ETHUSDm", "USOILm", "UKOILm",
}

redis_client: Optional[redis.Redis] = None
worker_stop_event = Event()
worker_threads: List[Thread] = []
account_lock_registry: Dict[str, Lock] = {}
account_lock_registry_guard = Lock()
diagnostic_log_lock = Lock()

BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "output"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
REPLAY_DIAGNOSTICS_LOG = OUTPUTS_DIR / "replay-diagnostics.jsonl"
REPLAY_BACKEND_FAILURE_LOG = OUTPUTS_DIR / "replay-backend-failures.jsonl"
REPLAY_DETAILS_DIR = OUTPUTS_DIR / "replay-details"
REPLAY_DETAILS_DIR.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def log_diagnostic(*, account_number: str, issue: str, details: dict) -> None:
    record = {
        "logged_at": now_iso(),
        "account_number": account_number,
        "issue": issue,
        "details": details,
    }
    with diagnostic_log_lock:
        with REPLAY_DIAGNOSTICS_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def _round6(value: float) -> float:
    return round(float(value), 6)


def log_backend_failure(
    *,
    result: BreezyReplayResult,
    backend_status_code: Optional[int] = None,
    response_text: Optional[str] = None,
    error: Optional[str] = None,
) -> None:
    record = {
        "logged_at": now_iso(),
        "account_number": result.account_number,
        "session_id": result.session_id,
        "processed_at": result.processed_at,
        "breach_reason": result.breach_reason,
        "account_status": result.account_status,
        "backend_status_code": backend_status_code,
        "response_text": response_text,
        "error": error,
    }
    with diagnostic_log_lock:
        with REPLAY_BACKEND_FAILURE_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def write_replay_detail_file(*, account_number: str, detail: dict) -> None:
    REPLAY_DETAILS_DIR.mkdir(parents=True, exist_ok=True)
    target_path = REPLAY_DETAILS_DIR / f"{account_number}.json"
    payload = {
        "saved_at": now_iso(),
        **detail,
    }
    with diagnostic_log_lock:
        with target_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)


def safe_write_replay_detail_file(*, account_number: str, detail: dict) -> None:
    return


def post_result_to_backend(result: BreezyReplayResult) -> None:
    if not BACKEND_BREEZY_METRICS_URL:
        log_backend_failure(
            result=result,
            error="missing_backend_breezy_metrics_url",
        )
        return

    payload = {
        "account_number": result.account_number,
        "platform": "mt5",
        "balance": result.snapshot.get("balance") if result.snapshot else None,
        "equity": result.snapshot.get("equity") if result.snapshot else None,
        "unrealized_pnl": result.unrealized_pnl,
        "account_status": result.account_status,
        "breach_reason": result.breach_reason,
        "capital_protection_level": result.capital_protection_level,
        "min_equity": result.min_equity,
        "peak_balance": result.peak_balance,
        "trading_cycle_start": result.trading_cycle_start,
        "trading_cycle_source": result.trading_cycle_source,
        "realized_profit": result.realized_profit,
        "profit_percent": result.profit_percent,
        "closed_trades": result.closed_trades,
        "risk_score": result.risk_score,
        "risk_score_band": result.risk_score_band,
        "components": result.components,
        "profit_split": result.profit_split,
        "withdrawal_eligible": result.withdrawal_eligible,
        "withdrawal_block_reason": result.withdrawal_block_reason,
        "breach_event": result.breach_event,
        "daily_pnl_summary": result.daily_pnl_summary,
        "snapshot": result.snapshot,
        "max_total_exposure": result.max_total_exposure,
        "max_single_position_risk": result.max_single_position_risk,
    }
    headers = {}
    if BACKEND_ENGINE_SECRET:
        headers["X-ENGINE-SECRET"] = BACKEND_ENGINE_SECRET

    response = requests.post(
        BACKEND_BREEZY_METRICS_URL,
        json=payload,
        headers=headers,
        timeout=15,
    )
    if not response.ok:
        log_backend_failure(
            result=result,
            backend_status_code=response.status_code,
            response_text=response.text[:4000],
        )
    response.raise_for_status()


class PositionPayload(BaseModel):
    ticket: Optional[str] = None
    position_id: Optional[str] = None
    symbol: str
    volume: float
    open_price: float
    open_time_ms: int
    type: int
    stop_loss_price: Optional[float] = None
    stop_loss_pips: Optional[float] = None
    pip_value: Optional[float] = None


class ClosedDealPayload(BaseModel):
    deal_id: str
    position_id: Optional[str] = None
    symbol: str
    time_ms: int
    entry: int
    type: int
    volume: float
    price: float
    profit: float
    commission: float
    swap: float
    deal_type: Optional[str] = None
    stop_loss_price: Optional[float] = None
    stop_loss_pips: Optional[float] = None
    pip_value: Optional[float] = None


class SymbolMetaPayload(BaseModel):
    symbol: str
    contract_size: float
    tick_value: float
    tick_size: float


class BreezyEAPayload(BaseModel):
    account_number: str
    account_type: Optional[str] = "breezy"
    platform: str = "mt5"
    account_size: Optional[float] = None
    current_balance: float
    current_equity: float
    trading_cycle_start: Optional[str] = None
    trading_cycle_source: Optional[str] = None
    anchor_time_ms: int
    positions: List[PositionPayload] = Field(default_factory=list)
    closed_deals: List[ClosedDealPayload] = Field(default_factory=list)
    symbols: List[SymbolMetaPayload] = Field(default_factory=list)
    risk_score_override: Optional[int] = None


class BreezyReplayInputPayload(BaseModel):
    account_number: str
    initial_balance: float
    capital_protection_percent: float = 50.0
    minimum_profit_percent_for_withdrawal: float = 5.0
    minimum_closed_trades_for_withdrawal: int = 5
    minimum_risk_score_for_withdrawal: int = 40
    risk_score_override: Optional[int] = None


class BreezyReplaySession(BaseModel):
    session_id: str
    account_number: str
    ea_payload: Optional[BreezyEAPayload]
    replay_input: Optional[BreezyReplayInputPayload]
    created_at: str
    updated_at: str
    status: str = "queued"


class BreezyReplayResult(BaseModel):
    session_id: str
    account_number: str
    received_at: Optional[str] = None
    processing_started_at: Optional[str] = None
    processed_at: Optional[str] = None
    processing_duration_ms: Optional[float] = None
    account_status: str
    breach_reason: Optional[str] = None
    capital_protection_level: float
    min_equity: float
    peak_balance: float
    unrealized_pnl: float = 0.0
    trading_cycle_start: Optional[str] = None
    trading_cycle_source: Optional[str] = None
    realized_profit: float
    profit_percent: float
    closed_trades: int
    risk_score: int
    risk_score_band: str
    components: Dict[str, object] = Field(default_factory=dict)
    max_total_exposure: float = 0.0
    max_single_position_risk: float = 0.0
    profit_split: int
    withdrawal_eligible: bool
    withdrawal_block_reason: Optional[str] = None
    breach_event: Optional[dict] = None
    daily_pnl_summary: List[dict] = Field(default_factory=list)
    snapshot: Optional[dict] = None


class ReplayEnqueueResponse(BaseModel):
    session_id: str
    account_number: str
    status: str
    queued_at: str


class ReplayStatusResponse(BaseModel):
    session_id: str
    account_number: str
    status: str
    queued_at: Optional[str] = None
    updated_at: Optional[str] = None
    error: Optional[str] = None
    result: Optional[dict] = None


SESSIONS: Dict[str, BreezyReplaySession] = {}


def _session_key(session_id: str) -> str:
    return f"{BREEZY_REPLAY_SESSION_PREFIX}{session_id}"


def _latest_session_key(account_number: str) -> str:
    return f"{BREEZY_REPLAY_LATEST_SESSION_PREFIX}{account_number}"


def get_account_processing_lock(account_number: str) -> Lock:
    with account_lock_registry_guard:
        existing = account_lock_registry.get(account_number)
        if existing is not None:
            return existing
        created = Lock()
        account_lock_registry[account_number] = created
        return created


def get_redis_client() -> Optional[redis.Redis]:
    global redis_client
    if redis_client is not None:
        return redis_client
    try:
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        return redis_client
    except Exception:
        redis_client = None
        return None


def save_session_record(
    session: BreezyReplaySession,
    *,
    status: Optional[str] = None,
    result: Optional[BreezyReplayResult] = None,
    error: Optional[str] = None,
) -> None:
    if status:
        session.status = status
    session.updated_at = now_iso()
    SESSIONS[session.session_id] = session
    client = get_redis_client()
    if not client:
        return
    payload = {
        "session": session.model_dump(mode="json"),
        "status": session.status,
        "error": error,
        "result": result.model_dump(mode="json") if result else None,
    }
    client.set(_session_key(session.session_id), json.dumps(payload))


def load_session_record(session_id: str) -> Optional[dict]:
    client = get_redis_client()
    if client:
        raw = client.get(_session_key(session_id))
        if raw:
            return json.loads(raw)
    session = SESSIONS.get(session_id)
    if not session:
        return None
    return {"session": session.model_dump(mode="json"), "status": session.status, "error": None, "result": None}


def enqueue_session(session: BreezyReplaySession) -> None:
    save_session_record(session, status="queued")
    client = get_redis_client()
    if not client:
        raise HTTPException(status_code=503, detail="Replay queue is unavailable")
    client.set(_latest_session_key(session.account_number), session.session_id)
    client.lpush(BREEZY_REPLAY_QUEUE_KEY, session.session_id)


def is_latest_session_for_account(session: BreezyReplaySession) -> bool:
    client = get_redis_client()
    if not client:
        return True
    try:
        latest_session_id = client.get(_latest_session_key(session.account_number))
        return not latest_session_id or latest_session_id == session.session_id
    except Exception:
        return True


def replay_worker_loop() -> None:
    client = get_redis_client()
    if not client:
        return
    while not worker_stop_event.is_set():
        try:
            job = client.brpop(BREEZY_REPLAY_QUEUE_KEY, timeout=5)
            if not job:
                continue
            _, session_id = job
            record = load_session_record(session_id)
            if not record:
                continue
            session = BreezyReplaySession.model_validate(record["session"])
            account_lock = get_account_processing_lock(session.account_number)
            with account_lock:
                if not is_latest_session_for_account(session):
                    save_session_record(session, status="failed", error="superseded_by_newer_session")
                    continue
                save_session_record(session, status="processing")
                result = calculate_result(session)
                save_session_record(session, status="completed", result=result)
                try:
                    post_result_to_backend(result)
                except Exception as callback_exc:
                    log_diagnostic(
                        account_number=session.account_number,
                        issue="backend_callback_failed",
                        details={"error": str(callback_exc), "session_id": session.session_id},
                    )
        except Exception as exc:
            try:
                if 'session' in locals():
                    log_diagnostic(
                        account_number=session.account_number,
                        issue="session_processing_failed",
                        details={"session_id": session.session_id, "error": str(exc)},
                    )
                    save_session_record(session, status="failed", error=str(exc))
            except Exception:
                pass


@app.on_event("startup")
def startup_event() -> None:
    client = get_redis_client()
    if not client:
        return
    worker_stop_event.clear()
    worker_threads.clear()
    for index in range(BREEZY_REPLAY_WORKER_COUNT):
        worker = Thread(target=replay_worker_loop, name=f"breezy-replay-worker-{index + 1}", daemon=True)
        worker.start()
        worker_threads.append(worker)


@app.on_event("shutdown")
def shutdown_event() -> None:
    worker_stop_event.set()


def build_replay_input_from_payload(payload: BreezyEAPayload) -> BreezyReplayInputPayload:
    initial_balance = float(payload.account_size or payload.current_balance)
    return BreezyReplayInputPayload(
        account_number=payload.account_number,
        initial_balance=initial_balance,
        risk_score_override=payload.risk_score_override,
    )


def _deal_is_withdrawal(deal: ClosedDealPayload) -> bool:
    return str(deal.deal_type or "").upper() in {"WITHDRAWAL", "WITHDRAW"}


def _deal_is_deposit(deal: ClosedDealPayload) -> bool:
    return str(deal.deal_type or "").upper() in {"DEPOSIT"}


def _is_balance_symbol(deal: ClosedDealPayload) -> bool:
    return str(deal.symbol or "").upper() == "BALANCE"


def _should_ignore_deal(deal: ClosedDealPayload) -> bool:
    return _deal_is_deposit(deal) or _deal_is_withdrawal(deal) or _is_balance_symbol(deal)


def _resolve_cycle_start(payload: BreezyEAPayload) -> tuple[Optional[str], Optional[str], Optional[int]]:
    withdrawals = [deal for deal in payload.closed_deals if _deal_is_withdrawal(deal)]
    if withdrawals:
        last_withdrawal = max(withdrawals, key=lambda d: d.time_ms)
        return (
            datetime.utcfromtimestamp(last_withdrawal.time_ms / 1000).isoformat() + "Z",
            "withdrawal",
            last_withdrawal.time_ms,
        )

    deposits = [deal for deal in payload.closed_deals if _deal_is_deposit(deal)]
    if deposits:
        first_deposit = min(deposits, key=lambda d: d.time_ms)
        first_trade_candidates: List[int] = []

        for deal in payload.closed_deals:
            if _should_ignore_deal(deal):
                continue
            if deal.time_ms >= first_deposit.time_ms:
                first_trade_candidates.append(deal.time_ms)

        for position in payload.positions:
            if position.open_time_ms >= first_deposit.time_ms:
                first_trade_candidates.append(position.open_time_ms)

        if first_trade_candidates:
            first_trade_ms = min(first_trade_candidates)
            return (
                datetime.utcfromtimestamp(first_trade_ms / 1000).isoformat() + "Z",
                "first_trade_after_deposit",
                first_trade_ms,
            )

        return (
            datetime.utcfromtimestamp(first_deposit.time_ms / 1000).isoformat() + "Z",
            "deposit",
            first_deposit.time_ms,
        )

    return (payload.trading_cycle_start, payload.trading_cycle_source, payload.anchor_time_ms)


def _symbol_meta_map(payload: BreezyEAPayload) -> Dict[str, SymbolMetaPayload]:
    return {meta.symbol: meta for meta in payload.symbols}


def _unsupported_symbols(symbols: List[str]) -> List[str]:
    return sorted(symbol for symbol in symbols if symbol not in SUPPORTED_MARKET_SYMBOLS)


def _deal_net(deal: ClosedDealPayload) -> float:
    return deal.profit + deal.commission + deal.swap


def _position_key(position_id: Optional[str], ticket: Optional[str], symbol: str, open_time_ms: int) -> str:
    return position_id or ticket or f"{symbol}:{open_time_ms}"


def _merge_position(existing: PositionPayload, incoming: PositionPayload) -> PositionPayload:
    combined_volume = _round6(existing.volume + incoming.volume)
    if combined_volume <= 0:
        return incoming

    weighted_open_price = incoming.open_price
    if existing.volume > 0 and incoming.volume > 0:
        weighted_open_price = _round6(
            ((existing.open_price * existing.volume) + (incoming.open_price * incoming.volume)) / combined_volume
        )

    return PositionPayload(
        ticket=existing.ticket or incoming.ticket,
        position_id=existing.position_id or incoming.position_id,
        symbol=existing.symbol,
        volume=combined_volume,
        open_price=weighted_open_price,
        open_time_ms=min(existing.open_time_ms, incoming.open_time_ms),
        type=existing.type,
        stop_loss_price=incoming.stop_loss_price if incoming.stop_loss_price is not None else existing.stop_loss_price,
        stop_loss_pips=incoming.stop_loss_pips if incoming.stop_loss_pips is not None else existing.stop_loss_pips,
        pip_value=incoming.pip_value if incoming.pip_value is not None else existing.pip_value,
    )


def _positions_equivalent(existing: PositionPayload, incoming: PositionPayload) -> bool:
    return (
        existing.symbol == incoming.symbol
        and existing.type == incoming.type
        and existing.position_id == incoming.position_id
        and existing.open_time_ms == incoming.open_time_ms
        and _round6(existing.volume) == _round6(incoming.volume)
        and _round6(existing.open_price) == _round6(incoming.open_price)
    )


def _apply_open_position(open_positions: Dict[str, PositionPayload], key: str, position: PositionPayload) -> PositionPayload:
    existing = open_positions.get(key)
    if existing is None:
        open_positions[key] = position
        return position
    if _positions_equivalent(existing, position):
        return existing
    merged = _merge_position(existing, position)
    open_positions[key] = merged
    return merged


def _pnl_from_ticks(position: PositionPayload, tick: dict, meta: SymbolMetaPayload) -> float:
    price = tick.get("bid") if position.type == 0 else tick.get("ask")
    if price is None:
        return 0.0
    price_diff = price - position.open_price if position.type == 0 else position.open_price - price
    if meta.tick_value > 0 and meta.tick_size > 0:
        ticks = price_diff / meta.tick_size
        return _round6(ticks * meta.tick_value * position.volume)

    if meta.contract_size > 0:
        return _round6(price_diff * meta.contract_size * position.volume)

    return 0.0


def _position_risk_amount(position: PositionPayload, meta: Optional[SymbolMetaPayload]) -> Optional[float]:
    """
    Kept for compatibility, but Breezy scoring should rely on replayed adverse excursion
    rather than mutable SL intent. This may still be useful for diagnostics later.
    """
    if position.stop_loss_price is not None and meta is not None:
        price_diff = abs(position.open_price - position.stop_loss_price)
        if meta.tick_value > 0 and meta.tick_size > 0:
            ticks = price_diff / meta.tick_size
            return abs(ticks * meta.tick_value * position.volume)
        if meta.contract_size > 0:
            return abs(price_diff * meta.contract_size * position.volume)

    if position.stop_loss_pips is not None and position.pip_value is not None:
        return abs(position.stop_loss_pips * position.pip_value * position.volume)

    return None


def _ticks_for_symbols(symbols: List[str], start_ms: int, end_ms: int) -> tuple[Dict[str, List[dict]], Dict[str, dict]]:
    ticks_by_symbol: Dict[str, List[dict]] = {}
    fetch_issues: Dict[str, dict] = {}
    for symbol in symbols:
        try:
            response = requests.get(
                f"{TICK_SERVICE_URL}/get_ticks",
                params={"symbol": symbol, "start": start_ms, "end": end_ms},
                timeout=180,
            )
            response.raise_for_status()
            ticks_by_symbol[symbol] = response.json()
        except requests.RequestException as exc:
            ticks_by_symbol[symbol] = []
            fetch_issues[symbol] = {"message": str(exc), "start_ms": start_ms, "end_ms": end_ms}
    return ticks_by_symbol, fetch_issues


def ensure_replay_inputs_are_complete(
    *,
    payload: BreezyEAPayload,
    symbols: List[str],
    meta_map: Dict[str, SymbolMetaPayload],
    ticks_by_symbol: Dict[str, List[dict]],
    tick_fetch_issues: Dict[str, dict],
) -> None:
    missing_meta = sorted([symbol for symbol in symbols if symbol not in meta_map])
    invalid_meta = sorted([
        symbol for symbol, meta in meta_map.items()
        if symbol in symbols and (meta.tick_size <= 0 or (meta.tick_value <= 0 and meta.contract_size <= 0))
    ])
    missing_ticks = sorted([symbol for symbol in symbols if not ticks_by_symbol.get(symbol)])
    if not missing_meta and not invalid_meta and not missing_ticks:
        return
    log_diagnostic(
        account_number=payload.account_number,
        issue="replay_input_incomplete",
        details={
            "symbols": symbols,
            "missing_meta": missing_meta,
            "invalid_meta": invalid_meta,
            "missing_ticks": missing_ticks,
            "tick_fetch_issues": tick_fetch_issues,
        },
    )
    raise HTTPException(status_code=422, detail="Replay reconstruction inputs incomplete")


def replay_anchor_end_ms(payload: BreezyEAPayload) -> int:
    latest = payload.anchor_time_ms
    for deal in payload.closed_deals:
        latest = max(latest, deal.time_ms)
    for position in payload.positions:
        latest = max(latest, position.open_time_ms)
    return max(latest, int(datetime.utcnow().timestamp() * 1000))


def _build_structural_events(payload: BreezyEAPayload) -> List[tuple]:
    events: List[tuple] = []
    opening_deal_keys = {
        _position_key(deal.position_id, deal.position_id, deal.symbol, deal.time_ms)
        for deal in payload.closed_deals
        if not _should_ignore_deal(deal) and deal.entry == 0
    }
    for position in payload.positions:
        key = _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms)
        if position.open_time_ms <= payload.anchor_time_ms:
            continue
        if key in opening_deal_keys:
            continue
        events.append(("open", position.open_time_ms, position))
    for deal in payload.closed_deals:
        events.append(("deal", deal.time_ms, deal))
    events.sort(key=lambda item: (item[1], EVENT_ORDER.get(item[0], 9)))
    return events


def build_timeline(
    payload: BreezyEAPayload,
    ticks_by_symbol: Dict[str, List[dict]],
    meta_map: Dict[str, SymbolMetaPayload],
    initial_balance: float,
) -> List[dict]:
    events = _build_structural_events(payload)
    for symbol, ticks in ticks_by_symbol.items():
        for tick in ticks:
            time_ms = int(tick.get("time") or tick.get("time_msc") or 0)
            if time_ms:
                events.append(("tick", time_ms, symbol, tick))
    events.sort(key=lambda item: (item[1], EVENT_ORDER.get(item[0], 9)))

    open_positions: Dict[str, PositionPayload] = {}
    for position in payload.positions:
        if position.open_time_ms <= payload.anchor_time_ms:
            key = _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms)
            _apply_open_position(open_positions, key, position)

    balance = initial_balance
    last_ticks: Dict[str, dict] = {}
    snapshots: List[dict] = []

    def snapshot_at(time_ms: int, event: Optional[dict] = None) -> None:
        equity = balance
        open_positions_snapshot: List[dict] = []
        for position in open_positions.values():
            tick = last_ticks.get(position.symbol)
            meta = meta_map.get(position.symbol)
            floating_pnl = 0.0
            if tick and meta:
                floating_pnl = _pnl_from_ticks(position, tick, meta)
                equity += floating_pnl
            open_positions_snapshot.append({
                "key": _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms),
                "position_id": position.position_id,
                "ticket": position.ticket,
                "symbol": position.symbol,
                "volume": position.volume,
                "open_price": position.open_price,
                "open_time_ms": position.open_time_ms,
                "type": position.type,
                "stop_loss_price": position.stop_loss_price,
                "stop_loss_pips": position.stop_loss_pips,
                "pip_value": position.pip_value,
                "floating_pnl": floating_pnl,
            })
        snapshots.append({
            "time_ms": time_ms,
            "equity": equity,
            "balance": balance,
            "event": event,
            "open_positions_snapshot": open_positions_snapshot,
        })

    snapshot_at(payload.anchor_time_ms, {"type": "anchor"})

    for event in events:
        event_type = event[0]
        time_ms = event[1]
        if time_ms < payload.anchor_time_ms:
            continue
        event_meta: dict = {"type": event_type, "time_ms": time_ms}
        if event_type == "open":
            position = event[2]
            key = _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms)
            event_meta["key"] = key
            event_meta["position"] = _apply_open_position(open_positions, key, position)
            event_meta["position_id"] = position.position_id
            event_meta["ticket"] = position.ticket
            event_meta["symbol"] = position.symbol
            event_meta["volume"] = position.volume
        elif event_type == "deal":
            deal = event[2]
            key = deal.position_id or deal.deal_id
            event_meta["key"] = key
            event_meta["position_id"] = deal.position_id
            event_meta["deal_id"] = deal.deal_id
            event_meta["symbol"] = deal.symbol
            event_meta["entry"] = deal.entry
            event_meta["volume"] = deal.volume
            if _should_ignore_deal(deal):
                pass
            elif deal.entry == 0:
                position = PositionPayload(
                    ticket=deal.position_id,
                    position_id=deal.position_id,
                    symbol=deal.symbol,
                    volume=deal.volume,
                    open_price=deal.price,
                    open_time_ms=deal.time_ms,
                    type=deal.type,
                    stop_loss_price=deal.stop_loss_price,
                    stop_loss_pips=deal.stop_loss_pips,
                    pip_value=deal.pip_value,
                )
                key = _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms)
                event_meta["position"] = _apply_open_position(open_positions, key, position)
            elif deal.entry == 1:
                balance += _deal_net(deal)
                existing = open_positions.get(key)
                if existing is not None:
                    remaining_volume = _round6(existing.volume - deal.volume)
                    if remaining_volume > 0:
                        open_positions[key] = PositionPayload(
                            ticket=existing.ticket,
                            position_id=existing.position_id,
                            symbol=existing.symbol,
                            volume=remaining_volume,
                            open_price=existing.open_price,
                            open_time_ms=existing.open_time_ms,
                            type=existing.type,
                            stop_loss_price=existing.stop_loss_price,
                            stop_loss_pips=existing.stop_loss_pips,
                            pip_value=existing.pip_value,
                        )
                    else:
                        open_positions.pop(key, None)
                event_meta["profit"] = _round6(_deal_net(deal))
                event_meta["price"] = deal.price
        elif event_type == "tick":
            symbol = event[2]
            tick = event[3]
            last_ticks[symbol] = tick
        snapshot_at(time_ms, event_meta)
    return snapshots


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _risk_score_band(score: int) -> str:
    if score >= 60:
        return "PROFESSIONAL"
    if score >= 40:
        return "STABLE"
    if score >= 20:
        return "ACCEPTABLE"
    if score >= 0:
        return "RISKY"
    if score >= -40:
        return "DANGEROUS"
    return "EXTREME"


def _profit_split_for_score(score: int) -> int:
    if score >= 60:
        return 100
    if score >= 40:
        return 80
    if score >= 20:
        return 60
    if score >= 0:
        return 40
    return 0


def _score_trade_risk_usage(used_risk_fraction: float) -> int:
    if used_risk_fraction <= 0.01:
        return 2
    if used_risk_fraction <= 0.03:
        return 0
    if used_risk_fraction <= 0.06:
        return -3
    return -6


def _score_trade_efficiency(*, profit: float, used_risk_amount: float, mae_amount: float) -> int:
    if used_risk_amount <= 0:
        return 0 if profit <= 0 else 1

    rr = profit / used_risk_amount
    heat_ratio = (mae_amount / used_risk_amount) if used_risk_amount > 0 else 1.0
    if rr >= 1.5 and heat_ratio <= 0.5:
        return 2
    if rr >= 0 and heat_ratio <= 1.0:
        return 0
    return -2


def _score_trade_duration(duration_minutes: float) -> int:
    if duration_minutes >= 20:
        return 1
    if duration_minutes >= 3:
        return 0
    if duration_minutes >= 30:
        return 0
    if duration_minutes >= 1:
        return -1
    return -3


def _score_trade_total(*, risk_usage: int, efficiency: int, duration: int) -> int:
    return int(_clamp(risk_usage + efficiency + duration, -8, 5))


def _behavior_adjustment_for_closed_trade(current_trade: dict, previous_trades: List[dict]) -> tuple[int, dict]:
    recent_trades = previous_trades[-10:]
    penalty = 0
    reward = 0
    details = {
        "rapid_same_pair_entries": 0,
        "revenge_trading": 0,
        "inconsistent_lot_sizing": 0,
        "repeated_fast_closures": 0,
        "stable_lot_sizing": 0,
        "healthy_pacing": 0,
        "professional_recovery": 0,
    }

    current_symbol = str(current_trade.get("symbol") or "")
    current_opened_at = current_trade.get("opened_at_ms")
    current_closed_at = current_trade.get("closed_at_ms")
    current_volume = float(current_trade.get("volume", 0.0))
    current_duration_minutes = float(current_trade.get("duration_minutes", 0.0))

    same_symbol_recent = [
        trade for trade in recent_trades
        if str(trade.get("symbol") or "") == current_symbol
    ]
    if same_symbol_recent:
        latest_same_symbol = same_symbol_recent[-1]
        prior_opened_at = latest_same_symbol.get("opened_at_ms")
        if isinstance(current_opened_at, int) and isinstance(prior_opened_at, int):
            if (current_opened_at - prior_opened_at) <= 300_000:
                penalty -= 2
                details["rapid_same_pair_entries"] = -2

        prior_closed_at = latest_same_symbol.get("closed_at_ms")
        prior_profit = float(latest_same_symbol.get("profit", 0.0))
        prior_volume = float(latest_same_symbol.get("volume", 0.0))
        if (
            isinstance(current_opened_at, int)
            and isinstance(prior_closed_at, int)
            and current_opened_at >= prior_closed_at
            and (current_opened_at - prior_closed_at) <= 900_000
            and prior_profit < 0
            and current_volume > (prior_volume * 1.5)
            and current_duration_minutes < 15
        ):
            penalty -= 4
            details["revenge_trading"] = -4

    recent_volumes = [float(trade.get("volume", 0.0)) for trade in recent_trades if float(trade.get("volume", 0.0)) > 0]
    if recent_volumes and current_volume > 0:
        avg_recent_volume = sum(recent_volumes) / len(recent_volumes)
        min_recent_volume = min(recent_volumes)
        max_to_avg_ratio = (current_volume / avg_recent_volume) if avg_recent_volume > 0 else 0.0
        max_to_min_ratio = (current_volume / min_recent_volume) if min_recent_volume > 0 else 0.0
        if max_to_avg_ratio > 5 or max_to_min_ratio > 10:
            penalty -= 12
            details["inconsistent_lot_sizing"] = -12
        elif max_to_avg_ratio > 3 or max_to_min_ratio > 6:
            penalty -= 8
            details["inconsistent_lot_sizing"] = -8
        elif max_to_avg_ratio > 2 or max_to_min_ratio > 4:
            penalty -= 4
            details["inconsistent_lot_sizing"] = -4

    prior_fast_closures = sum(1 for trade in recent_trades if 3 <= float(trade.get("duration_minutes", 0.0)) < 5)
    prior_medium_fast_closures = sum(1 for trade in recent_trades if 1 <= float(trade.get("duration_minutes", 0.0)) < 3)
    prior_ultra_fast_closures = sum(1 for trade in recent_trades if float(trade.get("duration_minutes", 0.0)) < 1)
    if current_duration_minutes < 1 and prior_ultra_fast_closures >= 1:
        penalty -= 4
        details["repeated_fast_closures"] = -4
    elif current_duration_minutes < 3 and prior_medium_fast_closures >= 1:
        penalty -= 2
        details["repeated_fast_closures"] = -2
    elif current_duration_minutes < 5 and prior_fast_closures >= 2:
        penalty -= 1
        details["repeated_fast_closures"] = -1

    # Small positive behavior rewards (capped), while penalties remain stronger.
    if recent_trades:
        if current_volume > 0:
            avg_recent_volume = sum(float(trade.get("volume", 0.0)) for trade in recent_trades if float(trade.get("volume", 0.0)) > 0)
            count_recent_volume = sum(1 for trade in recent_trades if float(trade.get("volume", 0.0)) > 0)
            if count_recent_volume > 0:
                avg_recent_volume = avg_recent_volume / count_recent_volume
                if avg_recent_volume > 0 and details["inconsistent_lot_sizing"] == 0:
                    lot_ratio = current_volume / avg_recent_volume
                    if 0.75 <= lot_ratio <= 1.25:
                        reward += 1
                        details["stable_lot_sizing"] = 1

        if details["repeated_fast_closures"] == 0 and 8 <= current_duration_minutes <= 240:
            reward += 1
            details["healthy_pacing"] = 1

        latest_trade = recent_trades[-1]
        latest_profit = float(latest_trade.get("profit", 0.0))
        latest_volume = float(latest_trade.get("volume", 0.0))
        if latest_profit < 0 and float(current_trade.get("profit", 0.0)) > 0:
            if current_volume <= (latest_volume * 1.2) and current_duration_minutes >= 5:
                reward += 2
                details["professional_recovery"] = 2

    reward = int(_clamp(reward, 0, 3))
    return penalty + reward, details


def _weighted_trade_delta(trade_score: float) -> float:
    return trade_score * 0.80


def _weighted_behavior_delta(behavior_delta: float) -> float:
    return behavior_delta * 0.20


def _healthy_day_bonus(trade_metrics: List[dict], breach_reason: Optional[str]) -> tuple[float, List[dict]]:
    if breach_reason is not None or not trade_metrics:
        return 0.0, []

    days: Dict[str, List[dict]] = {}
    for trade in trade_metrics:
        closed_at_ms = trade.get("closed_at_ms")
        if not isinstance(closed_at_ms, int):
            continue
        day_key = datetime.utcfromtimestamp(closed_at_ms / 1000).date().isoformat()
        days.setdefault(day_key, []).append(trade)

    healthy_days: List[dict] = []
    for day_key, trades in sorted(days.items()):
        if not trades:
            continue
        worst_trade_score = min(float(trade.get("trade_score", 0.0)) for trade in trades)
        has_revenge_pattern = any(float((trade.get("behavior_details") or {}).get("revenge_trading", 0.0)) < 0 for trade in trades)
        has_lot_inconsistency = any(float((trade.get("behavior_details") or {}).get("inconsistent_lot_sizing", 0.0)) < 0 for trade in trades)
        is_healthy = (
            worst_trade_score >= -6
            and not has_revenge_pattern
            and not has_lot_inconsistency
        )
        healthy_days.append({
            "date": day_key,
            "closed_trades": len(trades),
            "worst_trade_score": _round6(worst_trade_score),
            "has_revenge_pattern": has_revenge_pattern,
            "has_lot_inconsistency": has_lot_inconsistency,
            "healthy": is_healthy,
        })

    healthy_day_count = sum(1 for day in healthy_days if day["healthy"])
    bonus = min(10.0, healthy_day_count * 0.5)
    return _round6(bonus), healthy_days


def enrich_breach_trade_details(*, payload: BreezyEAPayload, breach_event: Optional[dict]) -> Optional[dict]:
    if not breach_event:
        return breach_event

    breach_time_ms = breach_event.get("time_ms")
    largest_loss_trade = breach_event.get("largest_loss_trade")
    if not breach_time_ms or not isinstance(largest_loss_trade, dict):
        return breach_event

    position_id = largest_loss_trade.get("position_id")
    ticket = largest_loss_trade.get("ticket")
    symbol = largest_loss_trade.get("symbol")
    open_time_ms = largest_loss_trade.get("open_time_ms")

    if open_time_ms is not None:
      breach_event["breach_trade_duration_min"] = round((breach_time_ms - open_time_ms) / 60000.0, 4)

    breach_event["breach_trade"] = {
        "position_id": position_id,
        "ticket": ticket,
        "symbol": symbol,
        "open_time_ms": open_time_ms,
        "volume": largest_loss_trade.get("volume"),
        "type": largest_loss_trade.get("type"),
        "open_price": largest_loss_trade.get("open_price"),
        "floating_pnl_at_breach": largest_loss_trade.get("floating_pnl"),
        "stop_loss_price": largest_loss_trade.get("stop_loss_price"),
        "stop_loss_pips": largest_loss_trade.get("stop_loss_pips"),
        "pip_value": largest_loss_trade.get("pip_value"),
    }

    matching_close = None
    for deal in payload.closed_deals:
        if deal.entry != 1 or _should_ignore_deal(deal):
            continue
        if position_id and deal.position_id == position_id and deal.time_ms >= breach_time_ms:
            matching_close = deal
            break
        if not position_id and ticket and deal.position_id == ticket and deal.time_ms >= breach_time_ms:
            matching_close = deal
            break

    if matching_close:
        minutes_after_breach = (matching_close.time_ms - breach_time_ms) / 60000.0
        breach_event["breach_trade_close"] = {
            "deal_id": matching_close.deal_id,
            "closed_time_ms": matching_close.time_ms,
            "minutes_after_breach": round(minutes_after_breach, 4),
            "closed_at_breach": abs(matching_close.time_ms - breach_time_ms) <= 60_000,
            "profit": _round6(_deal_net(matching_close)),
            "price": matching_close.price,
        }
    else:
        breach_event["breach_trade_close"] = {
            "closed_at_breach": False,
            "closed_after_breach": False,
        }

    breach_event.pop("largest_loss_trade", None)
    return breach_event


def build_unsupported_symbol_breach_result(
    *,
    session: BreezyReplaySession,
    payload: BreezyEAPayload,
    replay: BreezyReplayInputPayload,
    processing_started_at: str,
    started_at: float,
    unsupported_symbols: List[str],
    cycle_start: Optional[str],
    cycle_source: Optional[str],
) -> BreezyReplayResult:
    capital_protection_level = replay.initial_balance * (replay.capital_protection_percent / 100)
    all_symbols = sorted({pos.symbol for pos in payload.positions} | {deal.symbol for deal in payload.closed_deals if not _should_ignore_deal(deal)})
    breach_event = {
        "type": "validation",
        "time_ms": payload.anchor_time_ms,
        "reason": "Unsupported symbols detected in replay payload.",
        "unsupported_symbols": unsupported_symbols,
    }
    processed_at = now_iso()
    result = BreezyReplayResult(
        session_id=session.session_id,
        account_number=session.account_number,
        received_at=session.created_at,
        processing_started_at=processing_started_at,
        processed_at=processed_at,
        processing_duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
        account_status="terminated",
        breach_reason="UNSUPPORTED_SYMBOL",
        capital_protection_level=capital_protection_level,
        min_equity=_round6(payload.current_equity),
        peak_balance=_round6(replay.initial_balance),
        unrealized_pnl=_round6(payload.current_equity - payload.current_balance),
        trading_cycle_start=cycle_start,
        trading_cycle_source=cycle_source,
        realized_profit=0.0,
        profit_percent=0.0,
        closed_trades=0,
        risk_score=0,
        risk_score_band=_risk_score_band(0),
        components={
            "model": "breezy_penalty_v2_closed_trade_only",
            "unsupported_symbols": unsupported_symbols,
            "validation_breach": True,
        },
        max_total_exposure=0.0,
        max_single_position_risk=0.0,
        profit_split=0,
        withdrawal_eligible=False,
        withdrawal_block_reason="ACCOUNT_TERMINATED",
        breach_event=breach_event,
        daily_pnl_summary=[],
        snapshot={
            "balance": _round6(payload.current_balance),
            "equity": _round6(payload.current_equity),
            "peak_balance": _round6(replay.initial_balance),
            "min_equity": _round6(payload.current_equity),
        },
    )
    safe_write_replay_detail_file(
        account_number=session.account_number,
        detail={
            "account_number": session.account_number,
            "session_id": session.session_id,
            "status": "completed",
            "result_type": "unsupported_symbol_breach",
            "symbols": all_symbols,
            "unsupported_symbols": unsupported_symbols,
            "inputs": {
                "initial_balance": _round6(replay.initial_balance),
                "capital_protection_percent": replay.capital_protection_percent,
                "minimum_profit_percent_for_withdrawal": replay.minimum_profit_percent_for_withdrawal,
                "minimum_closed_trades_for_withdrawal": replay.minimum_closed_trades_for_withdrawal,
                "minimum_risk_score_for_withdrawal": replay.minimum_risk_score_for_withdrawal,
                "positions_count": len(payload.positions),
                "closed_deals_count": len(payload.closed_deals),
                "anchor_time_ms": payload.anchor_time_ms,
            },
            "cycle": {
                "trading_cycle_start": cycle_start,
                "trading_cycle_source": cycle_source,
            },
            "breach_event": breach_event,
            "result": result.model_dump(mode="json"),
            "trade_metrics": [],
        },
    )
    return result


def calculate_result(session: BreezyReplaySession) -> BreezyReplayResult:
    processing_started_at = now_iso()
    started_at = time.perf_counter()
    if not session.ea_payload:
        raise HTTPException(status_code=400, detail="EA payload not found for session")
    if not session.replay_input:
        raise HTTPException(status_code=400, detail="Replay input not found for session")

    payload = session.ea_payload
    replay = session.replay_input
    cycle_start, cycle_source, _cycle_start_ms = _resolve_cycle_start(payload)

    symbols = sorted({pos.symbol for pos in payload.positions} | {deal.symbol for deal in payload.closed_deals if not _should_ignore_deal(deal)})
    unsupported_symbols = _unsupported_symbols(symbols)
    if unsupported_symbols:
        return build_unsupported_symbol_breach_result(
            session=session,
            payload=payload,
            replay=replay,
            processing_started_at=processing_started_at,
            started_at=started_at,
            unsupported_symbols=unsupported_symbols,
            cycle_start=cycle_start,
            cycle_source=cycle_source,
        )

    meta_map = _symbol_meta_map(payload)
    ticks_by_symbol, tick_fetch_issues = _ticks_for_symbols(symbols, payload.anchor_time_ms, replay_anchor_end_ms(payload))
    ensure_replay_inputs_are_complete(
        payload=payload,
        symbols=symbols,
        meta_map=meta_map,
        ticks_by_symbol=ticks_by_symbol,
        tick_fetch_issues=tick_fetch_issues,
    )

    capital_protection_level = replay.initial_balance * (replay.capital_protection_percent / 100)
    timeline = build_timeline(payload, ticks_by_symbol, meta_map, replay.initial_balance)

    peak_balance = replay.initial_balance
    equity_high = replay.initial_balance
    min_equity = float("inf")
    realized_profit = 0.0
    closed_trades = 0
    breach_reason: Optional[str] = None
    breach_event: Optional[dict] = None
    daily_pnl_map: Dict[str, float] = {}
    max_total_exposure = 0.0
    max_single_position_risk_fraction = 0.0
    opened_trade_volumes: List[float] = []
    first_trade_time_ms: Optional[int] = None
    last_trade_time_ms: Optional[int] = None
    trade_mae_amounts: Dict[str, float] = {}
    trade_sl_risk_amounts: Dict[str, float] = {}
    mae_tracker: Dict[str, dict] = {}
    trade_metrics: List[dict] = []
    risk_score_running = 0.0
    weighted_trade_delta_total = 0.0
    weighted_behavior_delta_total = 0.0
    behavior_penalty_totals = {
        "rapid_same_pair_entries": 0,
        "revenge_trading": 0,
        "inconsistent_lot_sizing": 0,
        "repeated_fast_closures": 0,
    }
    behavior_reward_totals = {
        "stable_lot_sizing": 0,
        "healthy_pacing": 0,
        "professional_recovery": 0,
    }

    seen_open_keys: set[str] = set()
    for position in payload.positions:
        opened_trade_volumes.append(position.volume)
        if first_trade_time_ms is None or position.open_time_ms < first_trade_time_ms:
            first_trade_time_ms = position.open_time_ms
        if last_trade_time_ms is None or position.open_time_ms > last_trade_time_ms:
            last_trade_time_ms = position.open_time_ms

    for snapshot in timeline:
        equity = snapshot["equity"]
        balance_snapshot = snapshot.get("balance", replay.initial_balance)
        ts = snapshot["time_ms"]
        event = snapshot.get("event") or {}

        if balance_snapshot > peak_balance:
            peak_balance = balance_snapshot
        if equity > equity_high:
            equity_high = equity
        if equity < min_equity:
            min_equity = equity

        total_risk_amount = 0.0
        snapshot_positions = snapshot.get("open_positions_snapshot") or []
        exposure_positions: List[dict] = []
        largest_loss_trade: Optional[dict] = None
        for position_data in snapshot_positions:
            position = PositionPayload(
                ticket=position_data.get("ticket"),
                position_id=position_data.get("position_id"),
                symbol=position_data["symbol"],
                volume=position_data["volume"],
                open_price=position_data["open_price"],
                open_time_ms=position_data["open_time_ms"],
                type=position_data["type"],
                stop_loss_price=position_data.get("stop_loss_price"),
                stop_loss_pips=position_data.get("stop_loss_pips"),
                pip_value=position_data.get("pip_value"),
            )
            meta = meta_map.get(position.symbol)
            floating_pnl = float(position_data.get("floating_pnl", 0.0))
            adverse_amount = _round6(max(0.0, -floating_pnl))
            sl_risk_amount = _position_risk_amount(position, meta)
            if sl_risk_amount is not None:
                sl_risk_amount = _round6(sl_risk_amount)
            effective_risk_amount = _round6(max(sl_risk_amount or 0.0, adverse_amount))

            key = position_data.get("key") or _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms)
            tracker = mae_tracker.get(key)
            if tracker is None:
                tracker = {
                    "position_id": position.position_id,
                    "ticket": position.ticket,
                    "symbol": position.symbol,
                    "entry_price": _round6(position.open_price),
                    "volume": _round6(position.volume),
                    "direction": position.type,
                    "opened_at": position.open_time_ms,
                    "max_adverse": 0.0,
                }
                mae_tracker[key] = tracker
            else:
                tracker["volume"] = _round6(position.volume)

            previous_mae = trade_mae_amounts.get(key, 0.0)
            if adverse_amount > previous_mae:
                trade_mae_amounts[key] = adverse_amount
            if adverse_amount > float(tracker.get("max_adverse", 0.0)):
                tracker["max_adverse"] = adverse_amount
            if sl_risk_amount is not None:
                previous_sl = trade_sl_risk_amounts.get(key, 0.0)
                if sl_risk_amount > previous_sl:
                    trade_sl_risk_amounts[key] = sl_risk_amount
            total_risk_amount += effective_risk_amount
            used_risk_fraction = _round6(effective_risk_amount / replay.initial_balance) if replay.initial_balance > 0 else 0.0
            assert 0 <= used_risk_fraction <= 1.0
            if used_risk_fraction > max_single_position_risk_fraction:
                max_single_position_risk_fraction = used_risk_fraction
            exposure_positions.append({
                "position_id": position.position_id,
                "ticket": position.ticket,
                "symbol": position.symbol,
                "mae_amount": adverse_amount,
                "sl_risk_amount": sl_risk_amount,
                "used_risk_amount": effective_risk_amount,
                "used_risk_percent": used_risk_fraction,
            })
            if largest_loss_trade is None or float(position_data.get("floating_pnl", 0.0)) < float(largest_loss_trade.get("floating_pnl", 0.0)):
                largest_loss_trade = dict(position_data)
        if balance_snapshot > 0:
            exposure_fraction = _round6(total_risk_amount / replay.initial_balance) if replay.initial_balance > 0 else 0.0
            assert exposure_fraction >= 0
            if exposure_fraction > max_total_exposure:
                max_total_exposure = exposure_fraction
        if event.get("type") == "deal" and event.get("profit") is not None:
            profit = float(event.get("profit", 0.0))
            realized_profit += profit
            closed_trades += 1
            day_key = datetime.utcfromtimestamp(ts / 1000).date().isoformat()
            daily_pnl_map[day_key] = daily_pnl_map.get(day_key, 0.0) + profit
            if first_trade_time_ms is None or ts < first_trade_time_ms:
                first_trade_time_ms = ts
            if last_trade_time_ms is None or ts > last_trade_time_ms:
                last_trade_time_ms = ts

            closed_key = event.get("key")
            mae_amount = trade_mae_amounts.get(closed_key, 0.0)
            sl_risk_amount = trade_sl_risk_amounts.get(closed_key, 0.0)
            realized_loss_amount = _round6(max(0.0, -profit))
            used_risk_amount = _round6(max(mae_amount, sl_risk_amount, realized_loss_amount))
            used_risk_fraction = _round6(used_risk_amount / replay.initial_balance) if replay.initial_balance > 0 else 0.0
            tracker = mae_tracker.get(closed_key, {})
            closed_symbol = tracker.get("symbol") or event.get("symbol")
            closed_meta = meta_map.get(str(closed_symbol)) if closed_symbol else None
            duration_ms = (ts - tracker.get("opened_at")) if tracker.get("opened_at") is not None else None
            duration_minutes = round((duration_ms or 0) / 60000.0, 4)

            trade_risk_usage_score = _score_trade_risk_usage(used_risk_fraction)
            trade_efficiency_score = _score_trade_efficiency(
                profit=profit,
                used_risk_amount=used_risk_amount,
                mae_amount=mae_amount,
            )
            trade_duration_score = _score_trade_duration(duration_minutes)
            trade_score = _score_trade_total(
                risk_usage=trade_risk_usage_score,
                efficiency=trade_efficiency_score,
                duration=trade_duration_score,
            )

            trade_metric = {
                "position_id": tracker.get("position_id") or event.get("position_id"),
                "deal_id": event.get("deal_id"),
                "symbol": closed_symbol,
                "profit": _round6(profit),
                "volume": float(event.get("volume") or tracker.get("volume") or 0.0),
                "opened_at_ms": tracker.get("opened_at"),
                "mae_amount": _round6(mae_amount),
                "sl_risk_amount": _round6(sl_risk_amount),
                "used_risk_amount": used_risk_amount,
                "used_risk_fraction": used_risk_fraction,
                "duration_ms": duration_ms,
                "duration_minutes": duration_minutes,
                "closed_at_ms": ts,
                "risk_usage_score": trade_risk_usage_score,
                "efficiency_score": trade_efficiency_score,
                "duration_score": trade_duration_score,
                "trade_score": trade_score,
            }

            behavior_adjustment, behavior_details = _behavior_adjustment_for_closed_trade(trade_metric, trade_metrics)
            weighted_trade_delta = _weighted_trade_delta(trade_score)
            weighted_behavior_delta = _weighted_behavior_delta(behavior_adjustment)
            final_trade_delta = weighted_trade_delta + weighted_behavior_delta
            previous_score = risk_score_running
            risk_score_running = _clamp(risk_score_running + final_trade_delta, -100.0, 100.0)
            weighted_trade_delta_total += weighted_trade_delta
            weighted_behavior_delta_total += weighted_behavior_delta
            for key, value in behavior_details.items():
                if key in behavior_penalty_totals:
                    behavior_penalty_totals[key] += int(value)
                if key in behavior_reward_totals:
                    behavior_reward_totals[key] += int(value)

            trade_metric["behavior_adjustment"] = behavior_adjustment
            trade_metric["behavior_details"] = behavior_details
            trade_metric["weighted_trade_delta"] = _round6(weighted_trade_delta)
            trade_metric["weighted_behavior_delta"] = _round6(weighted_behavior_delta)
            trade_metric["final_trade_delta"] = _round6(final_trade_delta)
            trade_metric["previous_score"] = _round6(previous_score)
            trade_metric["new_score"] = _round6(risk_score_running)
            trade_metrics.append(trade_metric)

            if closed_key in mae_tracker and event.get("volume") is not None:
                remaining_volume = _round6(float(mae_tracker[closed_key].get("volume", 0.0)) - float(event.get("volume", 0.0)))
                if remaining_volume > 0:
                    mae_tracker[closed_key]["volume"] = remaining_volume
                else:
                    mae_tracker[closed_key]["closed_at"] = ts
                    del mae_tracker[closed_key]

        if event.get("type") == "open":
            open_position = event.get("position")
            if isinstance(open_position, PositionPayload):
                key = _position_key(open_position.position_id, open_position.ticket, open_position.symbol, open_position.open_time_ms)
                if key not in seen_open_keys:
                    seen_open_keys.add(key)
                    opened_trade_volumes.append(open_position.volume)

        if breach_reason is None and equity < capital_protection_level:
            breach_reason = "CAPITAL_PROTECTION_LIMIT"
            breach_event = {
                "type": event.get("type", "tick"),
                "time_ms": ts,
                "equity": _round6(equity),
                "balance": _round6(balance_snapshot),
                "capital_protection_level": _round6(capital_protection_level),
                "reason": "Equity fell below the capital protection level.",
                "largest_loss_trade": largest_loss_trade,
                "open_positions_at_breach_count": len(snapshot_positions),
                "open_positions_at_breach": snapshot_positions,
            }
            break

    if min_equity == float("inf"):
        min_equity = payload.current_equity

    if equity_high <= 0:
        equity_high = replay.initial_balance

    profit_percent = _round6((realized_profit / replay.initial_balance * 100) if replay.initial_balance > 0 else 0.0)
    account_status = "terminated" if breach_reason == "CAPITAL_PROTECTION_LIMIT" else "active"
    unrealized_pnl = _round6(payload.current_equity - payload.current_balance)

    executed_trade_volumes = [float(trade.get("volume", 0.0)) for trade in trade_metrics if float(trade.get("volume", 0.0)) > 0]
    volume_source = executed_trade_volumes or opened_trade_volumes
    max_lot = max(volume_source) if volume_source else 0.0
    avg_lot = (sum(volume_source) / len(volume_source)) if volume_source else 0.0

    trade_delta_total = sum(float(trade.get("trade_score", 0.0)) for trade in trade_metrics)
    avg_trade_score = (trade_delta_total / len(trade_metrics)) if trade_metrics else 0.0

    weighted_trade_component = weighted_trade_delta_total
    weighted_behavior_component = weighted_behavior_delta_total
    healthy_day_bonus, healthy_days = _healthy_day_bonus(trade_metrics, breach_reason)
    risk_score_with_day_bonus = _clamp(risk_score_running + healthy_day_bonus, -100.0, 100.0)
    risk_score = int(round(risk_score_with_day_bonus))

    assert 0 <= max_total_exposure
    assert 0 <= max_single_position_risk_fraction <= 1.0

    if replay.risk_score_override is not None:
        risk_score = int(_clamp(float(replay.risk_score_override), -100.0, 100.0))

    risk_score_band = _risk_score_band(risk_score)
    profit_split = _profit_split_for_score(risk_score)
    components = {
        "model": "breezy_balance_v3_closed_trade_only",
        "trade_component_weighted": _round6(weighted_trade_component),
        "behavior_component_weighted": _round6(weighted_behavior_component),
        "healthy_day_bonus": _round6(healthy_day_bonus),
        "healthy_day_count": sum(1 for day in healthy_days if day["healthy"]),
        "healthy_days": healthy_days,
        "trade_delta_total": _round6(trade_delta_total),
        "behavior_delta_total": _round6(sum(float(trade.get("behavior_adjustment", 0.0)) for trade in trade_metrics)),
        "average_trade_score": _round6(avg_trade_score),
        "closed_trade_count_scored": len(trade_metrics),
        "trade_score_range": {"best": 5, "worst": -8},
        "behavior_penalties": {
            **behavior_penalty_totals,
        },
        "behavior_rewards": {
            **behavior_reward_totals,
        },
        "trade_metrics_summary": {
            "max_total_exposure": _round6(max_total_exposure),
            "max_single_position_risk": _round6(max_single_position_risk_fraction),
            "max_lot": _round6(max_lot),
            "avg_lot": _round6(avg_lot),
        },
        "transparency": {
            "score_breakdown": {
                "trades_contribution": _round6(weighted_trade_component),
                "behavior_contribution": _round6(weighted_behavior_component),
                "healthy_day_bonus": _round6(healthy_day_bonus),
                "final_breezy_score": risk_score,
            },
            "healthy_days": healthy_days,
            "trade_cards": trade_metrics,
        },
        "last_closed_trade": trade_metrics[-1] if trade_metrics else None,
        "score_progress": risk_score,
    }

    withdrawal_block_reason: Optional[str] = None
    withdrawal_eligible = True
    if account_status == "terminated":
        withdrawal_eligible = False
        withdrawal_block_reason = "ACCOUNT_TERMINATED"
    elif realized_profit < (replay.initial_balance * (replay.minimum_profit_percent_for_withdrawal / 100)):
        withdrawal_eligible = False
        withdrawal_block_reason = "PROFIT_BELOW_5_PERCENT"
    elif closed_trades < replay.minimum_closed_trades_for_withdrawal:
        withdrawal_eligible = False
        withdrawal_block_reason = "LESS_THAN_5_TRADES"
    elif risk_score < replay.minimum_risk_score_for_withdrawal:
        withdrawal_eligible = False
        withdrawal_block_reason = "RISK_SCORE_TOO_LOW"

    breach_event = enrich_breach_trade_details(payload=payload, breach_event=breach_event)

    processed_at = now_iso()
    result = BreezyReplayResult(
        session_id=session.session_id,
        account_number=session.account_number,
        received_at=session.created_at,
        processing_started_at=processing_started_at,
        processed_at=processed_at,
        processing_duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
        account_status=account_status,
        breach_reason=breach_reason,
        capital_protection_level=capital_protection_level,
        min_equity=min_equity,
        peak_balance=peak_balance,
        unrealized_pnl=unrealized_pnl,
        trading_cycle_start=cycle_start,
        trading_cycle_source=cycle_source,
        realized_profit=_round6(realized_profit),
        profit_percent=profit_percent,
        closed_trades=closed_trades,
        risk_score=risk_score,
        risk_score_band=risk_score_band,
        components=components,
        max_total_exposure=_round6(max_total_exposure),
        max_single_position_risk=_round6(max_single_position_risk_fraction),
        profit_split=profit_split,
        withdrawal_eligible=withdrawal_eligible,
        withdrawal_block_reason=withdrawal_block_reason,
        breach_event=breach_event,
        daily_pnl_summary=[{"date": key, "pnl": _round6(value)} for key, value in sorted(daily_pnl_map.items())],
        snapshot={
            "balance": _round6(payload.current_balance),
            "equity": _round6(payload.current_equity),
            "peak_balance": _round6(peak_balance),
            "min_equity": _round6(min_equity),
        },
    )
    safe_write_replay_detail_file(
        account_number=session.account_number,
        detail={
            "account_number": session.account_number,
            "session_id": session.session_id,
            "status": "completed",
            "result_type": "standard_replay",
            "symbols": symbols,
            "inputs": {
                "initial_balance": _round6(replay.initial_balance),
                "capital_protection_percent": replay.capital_protection_percent,
                "minimum_profit_percent_for_withdrawal": replay.minimum_profit_percent_for_withdrawal,
                "minimum_closed_trades_for_withdrawal": replay.minimum_closed_trades_for_withdrawal,
                "minimum_risk_score_for_withdrawal": replay.minimum_risk_score_for_withdrawal,
                "positions_count": len(payload.positions),
                "closed_deals_count": len(payload.closed_deals),
                "anchor_time_ms": payload.anchor_time_ms,
                "current_balance": _round6(payload.current_balance),
                "current_equity": _round6(payload.current_equity),
            },
            "cycle": {
                "trading_cycle_start": cycle_start,
                "trading_cycle_source": cycle_source,
            },
            "summary": {
                "realized_profit": _round6(realized_profit),
                "profit_percent": profit_percent,
                "closed_trades": closed_trades,
                "risk_score": risk_score,
                "risk_score_band": risk_score_band,
                "healthy_day_bonus": _round6(healthy_day_bonus),
                "max_total_exposure": _round6(max_total_exposure),
                "max_single_position_risk": _round6(max_single_position_risk_fraction),
                "withdrawal_eligible": withdrawal_eligible,
                "withdrawal_block_reason": withdrawal_block_reason,
            },
            "components": components,
            "daily_pnl_summary": [{"date": key, "pnl": _round6(value)} for key, value in sorted(daily_pnl_map.items())],
            "breach_event": breach_event,
            "result": result.model_dump(mode="json"),
            "trade_metrics": trade_metrics,
        },
    )
    return result


@app.post("/breezy/replay/ea", response_model=ReplayEnqueueResponse, status_code=202)
async def submit_ea_payload(request: Request, payload: BreezyEAPayload):
    await request.body()
    session_id = str(uuid4())
    timestamp = now_iso()
    session = BreezyReplaySession(
        session_id=session_id,
        account_number=payload.account_number,
        ea_payload=payload,
        replay_input=build_replay_input_from_payload(payload),
        created_at=timestamp,
        updated_at=timestamp,
        status="queued",
    )
    enqueue_session(session)
    response = ReplayEnqueueResponse(session_id=session_id, account_number=payload.account_number, status="queued", queued_at=timestamp)
    return JSONResponse(status_code=202, content=response.model_dump(mode="json"))


@app.post("/breezy/replay/input", response_model=BreezyReplaySession)
def submit_replay_input(payload: BreezyReplayInputPayload):
    matching = next((sess for sess in SESSIONS.values() if sess.account_number == payload.account_number), None)
    timestamp = now_iso()
    if not matching:
        session_id = str(uuid4())
        session = BreezyReplaySession(
            session_id=session_id,
            account_number=payload.account_number,
            ea_payload=None,
            replay_input=payload,
            created_at=timestamp,
            updated_at=timestamp,
        )
        SESSIONS[session_id] = session
        return session

    session = BreezyReplaySession(
        session_id=matching.session_id,
        account_number=matching.account_number,
        ea_payload=matching.ea_payload,
        replay_input=payload,
        created_at=matching.created_at,
        updated_at=timestamp,
        status=matching.status,
    )
    SESSIONS[matching.session_id] = session
    return session


@app.get("/breezy/replay/result/{session_id}", response_model=ReplayStatusResponse)
def get_replay_result(session_id: str):
    record = load_session_record(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")
    session = BreezyReplaySession.model_validate(record["session"])
    return ReplayStatusResponse(
        session_id=session.session_id,
        account_number=session.account_number,
        status=record.get("status") or session.status,
        queued_at=session.created_at,
        updated_at=session.updated_at,
        error=record.get("error"),
        result=record.get("result"),
    )


@app.get("/breezy/replay/sessions", response_model=List[BreezyReplaySession])
def list_sessions():
    return list(SESSIONS.values())


@app.get("/health")
def health():
    return {"status": "ok", "service": "breezy-replay-engine"}
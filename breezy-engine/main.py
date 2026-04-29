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
    "EURGBPm", "EURJPYm", "GBPJPYm", "AUDJPYm", "NZDJPYm", "XAUUSDm", "XAGUSDm",
    "US30m", "US500m", "USTECm", "UK100m", "DE30m", "BTCUSDm", "ETHUSDm", "USOILm", "UKOILm",
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
REPLAY_SUCCESS_LOG = OUTPUTS_DIR / "replay-successful-metrics.jsonl"
REPLAY_BACKEND_FAILURE_LOG = OUTPUTS_DIR / "replay-backend-failures.jsonl"


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


def log_successful_metric_send(*, result: BreezyReplayResult, backend_status_code: Optional[int] = None) -> None:
    record = {
        "logged_at": now_iso(),
        "account_number": result.account_number,
        "session_id": result.session_id,
        "processed_at": result.processed_at,
        "breach_reason": result.breach_reason,
        "account_status": result.account_status,
        "backend_status_code": backend_status_code,
    }
    with diagnostic_log_lock:
        with REPLAY_SUCCESS_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


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


def log_exposure_snapshot(*, account_number: str, session_id: str, record: dict) -> None:
    log_diagnostic(
        account_number=account_number,
        issue="exposure_snapshot",
        details={"session_id": session_id, **record},
    )


def log_position_risk(*, account_number: str, session_id: str, record: dict) -> None:
    log_diagnostic(
        account_number=account_number,
        issue="position_risk",
        details={"session_id": session_id, **record},
    )


def log_summary(*, account_number: str, session_id: str, record: dict) -> None:
    log_diagnostic(
        account_number=account_number,
        issue="replay_summary",
        details={"session_id": session_id, **record},
    )


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
    if response.ok:
        log_successful_metric_send(result=result, backend_status_code=response.status_code)
    else:
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
    components: Dict[str, float | int] = Field(default_factory=dict)
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
                    log_diagnostic(
                        account_number=session.account_number,
                        issue="session_superseded",
                        details={"session_id": session.session_id},
                    )
                    save_session_record(session, status="failed", error="superseded_by_newer_session")
                    continue
                log_diagnostic(
                    account_number=session.account_number,
                    issue="session_processing_started",
                    details={"session_id": session.session_id},
                )
                save_session_record(session, status="processing")
                result = calculate_result(session)
                save_session_record(session, status="completed", result=result)
                log_diagnostic(
                    account_number=session.account_number,
                    issue="session_processing_completed",
                    details={
                        "session_id": session.session_id,
                        "risk_score": result.risk_score,
                        "account_status": result.account_status,
                    },
                )
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


def _risk_score_band(score: int) -> str:
    if score == 100:
        return "EXCELLENT"
    if 75 <= score <= 99:
        return "GOOD"
    if 60 <= score <= 74:
        return "FAIR"
    if 40 <= score <= 59:
        return "LOW"
    if score < 40:
        return "POOR"
    return "PENDING_LOGIC"


def _profit_split_for_score(score: int) -> int:
    if score == 100:
        return 100
    if 75 <= score <= 99:
        return 80
    if 60 <= score <= 74:
        return 60
    if 40 <= score <= 59:
        return 40
    return 0


def _score_total_exposure(max_total_exposure_fraction: float) -> int:
    if max_total_exposure_fraction <= 0.02:
        return 100
    if max_total_exposure_fraction <= 0.04:
        return 80
    if max_total_exposure_fraction <= 0.06:
        return 60
    if max_total_exposure_fraction <= 0.10:
        return 30
    return 0


def _score_drawdown(dd_fraction: float) -> int:
    if dd_fraction <= 0.05:
        return 100
    if dd_fraction <= 0.10:
        return 80
    if dd_fraction <= 0.20:
        return 60
    if dd_fraction <= 0.30:
        return 40
    if dd_fraction <= 0.40:
        return 20
    return 0


def _score_lot_control(max_lot: float, avg_lot: float) -> int:
    if avg_lot <= 0:
        return 100
    ratio = max_lot / avg_lot
    if ratio <= 1.5:
        return 100
    if ratio <= 2:
        return 80
    if ratio <= 3:
        return 60
    if ratio <= 5:
        return 30
    return 0


def _score_frequency(trades_per_hour: float) -> int:
    if trades_per_hour <= 2:
        return 100
    if trades_per_hour <= 5:
        return 80
    if trades_per_hour <= 10:
        return 60
    if trades_per_hour <= 20:
        return 30
    return 0


def _score_recent_trade_quality(used_risk_fraction: float, profit: float) -> int:
    if used_risk_fraction <= 0.02:
        score = 100
    elif used_risk_fraction <= 0.04:
        score = 80
    elif used_risk_fraction <= 0.06:
        score = 60
    elif used_risk_fraction <= 0.10:
        score = 40
    elif used_risk_fraction <= 0.15:
        score = 20
    else:
        score = 0

    if profit < 0:
        score = max(0, score - 15)
    return score


def _score_delta_from_trade_quality(trade_quality: int) -> int:
    if trade_quality >= 50:
        return int(round((trade_quality - 50) / 12))
    return int(round((trade_quality - 50) / 8))


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
        raise HTTPException(status_code=422, detail=f"Unsupported symbols: {', '.join(unsupported_symbols)}")

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
    exposure_spike_penalty = False
    extreme_loss_penalty = False
    opened_trade_volumes: List[float] = []
    first_trade_time_ms: Optional[int] = None
    last_trade_time_ms: Optional[int] = None
    trade_mae_amounts: Dict[str, float] = {}
    trade_sl_risk_amounts: Dict[str, float] = {}
    mae_tracker: Dict[str, dict] = {}
    latest_trade_quality: Optional[int] = None
    cumulative_score = 0
    good_streak = 0
    bad_streak = 0
    score_deltas: List[int] = []
    minimum_rewardable_risk_fraction = 0.003

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
            if exposure_fraction > 0.15:
                exposure_spike_penalty = True
            if max_single_position_risk_fraction > 0.15:
                exposure_spike_penalty = True
            log_exposure_snapshot(
                account_number=session.account_number,
                session_id=session.session_id,
                record={
                    "time_ms": ts,
                    "balance": _round6(balance_snapshot),
                    "equity": _round6(equity),
                    "total_exposure": exposure_fraction,
                    "positions": exposure_positions,
                },
            )

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
            latest_trade_quality = _score_recent_trade_quality(used_risk_fraction, profit)
            trade_delta = _score_delta_from_trade_quality(latest_trade_quality)

            if used_risk_fraction < minimum_rewardable_risk_fraction and trade_delta > 0:
                trade_delta = 0

            if trade_delta > 0:
                good_streak += 1
                bad_streak = 0
            elif trade_delta < 0:
                bad_streak += 1
                good_streak = 0
            else:
                good_streak = 0
                bad_streak = 0

            bonus_or_penalty = 0
            if good_streak >= 5:
                bonus_or_penalty += 5
                good_streak = 0
            if bad_streak >= 3:
                bonus_or_penalty -= 5
                bad_streak = 0

            applied_delta = trade_delta + bonus_or_penalty
            cumulative_score = max(0, min(100, cumulative_score + applied_delta))
            score_deltas.append(applied_delta)
            if replay.initial_balance > 0 and used_risk_amount / replay.initial_balance > 0.10:
                extreme_loss_penalty = True
            tracker = mae_tracker.get(closed_key, {})
            closed_symbol = tracker.get("symbol") or event.get("symbol")
            closed_meta = meta_map.get(str(closed_symbol)) if closed_symbol else None
            log_position_risk(
                account_number=session.account_number,
                session_id=session.session_id,
                record={
                    "position_id": tracker.get("position_id") or event.get("position_id"),
                    "deal_id": event.get("deal_id"),
                    "symbol": closed_symbol,
                    "entry_price": tracker.get("entry_price"),
                    "close_price": event.get("price"),
                    "contract_size": closed_meta.contract_size if closed_meta is not None else None,
                    "tick_value": closed_meta.tick_value if closed_meta is not None else None,
                    "tick_size": closed_meta.tick_size if closed_meta is not None else None,
                    "mae_amount": _round6(mae_amount),
                    "mae_percent": _round6(mae_amount / replay.initial_balance) if replay.initial_balance > 0 else 0.0,
                    "sl_risk_amount": _round6(sl_risk_amount),
                    "sl_percent": _round6(sl_risk_amount / replay.initial_balance) if replay.initial_balance > 0 else 0.0,
                    "realized_loss_amount": realized_loss_amount,
                    "realized_loss_percent": _round6(realized_loss_amount / replay.initial_balance) if replay.initial_balance > 0 else 0.0,
                    "used_risk_amount": used_risk_amount,
                    "used_risk_percent": used_risk_fraction,
                    "duration_ms": (ts - tracker.get("opened_at")) if tracker.get("opened_at") is not None else None,
                    "closed": True,
                    "trade_quality": latest_trade_quality,
                    "score_delta": applied_delta,
                    "running_score": cumulative_score,
                },
            )
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

    score_exposure_input = max_total_exposure
    exposure_component = _score_total_exposure(score_exposure_input)

    drawdown_fraction = _round6(((equity_high - min_equity) / equity_high) if equity_high > 0 else 1.0)
    drawdown_component = _score_drawdown(max(0.0, drawdown_fraction))

    max_lot = max(opened_trade_volumes) if opened_trade_volumes else 0.0
    avg_lot = (sum(opened_trade_volumes) / len(opened_trade_volumes)) if opened_trade_volumes else 0.0
    lot_component = _score_lot_control(max_lot, avg_lot)

    if first_trade_time_ms is not None and last_trade_time_ms is not None and last_trade_time_ms >= first_trade_time_ms:
        duration_hours = max((last_trade_time_ms - first_trade_time_ms) / 3_600_000, 1 / 60)
    else:
        duration_hours = 1.0
    trades_per_hour = _round6(closed_trades / duration_hours if duration_hours > 0 else float(closed_trades))
    frequency_component = _score_frequency(trades_per_hour)

    weighted_score = (
        exposure_component * 0.40
        + drawdown_component * 0.30
        + lot_component * 0.20
        + frequency_component * 0.10
    )
    behavior_score = max(0.0, min(100.0, weighted_score))

    if exposure_spike_penalty or extreme_loss_penalty or max_single_position_risk_fraction > 0.10:
        behavior_score = min(behavior_score, 50.0)

    risk_score = cumulative_score

    if exposure_spike_penalty or extreme_loss_penalty:
        risk_score = max(0, risk_score - 10)

    if latest_trade_quality is not None and latest_trade_quality < 50:
        risk_score = min(risk_score, 60)
    if latest_trade_quality is not None and latest_trade_quality < 40:
        risk_score = int(risk_score * 0.9)
    if closed_trades < 15:
        risk_score = min(risk_score, 35)

    assert 0 <= risk_score <= 100
    assert 0 <= max_total_exposure
    assert 0 <= max_single_position_risk_fraction <= 1.0

    if replay.risk_score_override is not None:
        risk_score = max(0, min(100, int(replay.risk_score_override)))

    risk_score_band = _risk_score_band(risk_score)
    profit_split = _profit_split_for_score(risk_score)
    components = {
        "total_exposure": exposure_component,
        "drawdown": drawdown_component,
        "lot_control": lot_component,
        "frequency": frequency_component,
        "behavior_score": int(round(behavior_score)),
        "latest_trade_quality": latest_trade_quality if latest_trade_quality is not None else 0,
        "score_progress": risk_score,
        "average_score_delta": int(round(sum(score_deltas) / len(score_deltas))) if score_deltas else 0,
        "minimum_rewardable_risk_percent": _round6(minimum_rewardable_risk_fraction * 100),
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

    log_summary(
        account_number=session.account_number,
        session_id=session.session_id,
        record={
            "max_total_exposure": _round6(max_total_exposure),
            "max_single_position_risk": _round6(max_single_position_risk_fraction),
            "risk_score": risk_score,
            "components": components,
            "withdrawal_eligible": withdrawal_eligible,
            "withdrawal_block_reason": withdrawal_block_reason,
        },
    )

    breach_event = enrich_breach_trade_details(payload=payload, breach_event=breach_event)

    processed_at = now_iso()
    return BreezyReplayResult(
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
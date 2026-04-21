from __future__ import annotations

import json
from datetime import datetime
import os
from pathlib import Path
from threading import Event, Lock, Thread
import time
from typing import Dict, List, Optional
from uuid import uuid4

import requests
import redis
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Replay Equity Curve", version="0.1.0")

TICK_SERVICE_URL = os.environ.get("TICK_SERVICE_URL", "http://15.237.52.163:8201")
BACKEND_BASE_URL = os.environ.get("BACKEND_BASE_URL", "")
BACKEND_REPLAY_ENDPOINT = os.environ.get("BACKEND_REPLAY_ENDPOINT", "/v1/mt5/metrics")
BACKEND_ENGINE_SECRET = os.environ.get("BACKEND_ENGINE_SECRET", "")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
REPLAY_QUEUE_KEY = os.environ.get("REPLAY_QUEUE_KEY", "mf:replay:queue")
REPLAY_SESSION_PREFIX = os.environ.get("REPLAY_SESSION_PREFIX", "mf:replay:session:")
REPLAY_WORKER_COUNT = max(1, int(os.environ.get("REPLAY_WORKER_COUNT", "2")))
EVENT_ORDER = {"open": 0, "deal": 1, "tick": 2}
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
SUPPORTED_MARKET_SYMBOLS = {
    "EURUSDm",
    "GBPUSDm",
    "AUDUSDm",
    "NZDUSDm",
    "USDJPYm",
    "USDCADm",
    "USDCHFm",
    "EURGBPm",
    "EURJPYm",
    "GBPJPYm",
    "AUDJPYm",
    "NZDJPYm",
    "XAUUSDm",
    "XAGUSDm",
    "US30m",
    "US500m",
    "USTECm",
    "UK100m",
    "DE30m",
    "BTCUSDm",
    "ETHUSDm",
    "USOILm",
    "UKOILm",
}


def log_replay_diagnostic(*, account_number: str, issue: str, details: dict) -> None:
    record = {
        "logged_at": now_iso(),
        "account_number": account_number,
        "issue": issue,
        "details": details,
    }
    with diagnostic_log_lock:
        with REPLAY_DIAGNOSTICS_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def log_successful_metric_send(*, result: ReplayResult, backend_status_code: Optional[int] = None) -> None:
    record = {
        "logged_at": now_iso(),
        "account_number": result.account_number,
        "session_id": result.session_id,
        "processed_at": result.processed_at,
        "breach_reason": result.breach_reason,
        "passed": result.passed,
        "backend_status_code": backend_status_code,
    }
    with diagnostic_log_lock:
        with REPLAY_SUCCESS_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def log_backend_failure(
    *,
    result: ReplayResult,
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
        "passed": result.passed,
        "backend_status_code": backend_status_code,
        "response_text": response_text,
        "error": error,
    }
    with diagnostic_log_lock:
        with REPLAY_BACKEND_FAILURE_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def ensure_replay_inputs_are_complete(
    *,
    payload: EAPayload,
    symbols: List[str],
    meta_map: Dict[str, SymbolMetaPayload],
    ticks_by_symbol: Dict[str, List[dict]],
    tick_fetch_issues: Dict[str, dict],
) -> None:
    missing_meta = sorted([symbol for symbol in symbols if symbol not in meta_map])
    invalid_meta = sorted([
        {
            "symbol": symbol,
            "tick_value": meta.tick_value,
            "tick_size": meta.tick_size,
            "contract_size": meta.contract_size,
        }
        for symbol, meta in meta_map.items()
        if symbol in symbols and (
            meta.tick_size <= 0
            or (meta.tick_value <= 0 and meta.contract_size <= 0)
        )
    ], key=lambda item: item["symbol"])
    fallback_meta = sorted([
        {
            "symbol": symbol,
            "tick_value": meta.tick_value,
            "tick_size": meta.tick_size,
            "contract_size": meta.contract_size,
            "fallback": "contract_size_price_diff",
        }
        for symbol, meta in meta_map.items()
        if symbol in symbols and meta.tick_value <= 0 and meta.tick_size > 0 and meta.contract_size > 0
    ], key=lambda item: item["symbol"])
    missing_ticks = sorted([
        symbol for symbol in symbols
        if not ticks_by_symbol.get(symbol)
    ])

    if not missing_meta and not invalid_meta and not missing_ticks:
        return

    details = {
        "symbols": symbols,
        "missing_meta": missing_meta,
        "invalid_meta": invalid_meta,
        "fallback_meta": fallback_meta,
        "missing_ticks": missing_ticks,
        "tick_fetch_issues": tick_fetch_issues,
        "anchor_time_ms": payload.anchor_time_ms,
        "positions_count": len(payload.positions),
        "closed_deals_count": len(payload.closed_deals),
    }
    log_replay_diagnostic(
        account_number=payload.account_number,
        issue="replay_input_incomplete",
        details=details,
    )
    raise HTTPException(status_code=422, detail="Replay reconstruction inputs incomplete")

def notify_backend(result: ReplayResult) -> None:
    payload = {
        "account_number": result.account_number,
        "platform": "mt5",
        "balance": result.snapshot.get("balance") if result.snapshot else None,
        "equity": result.snapshot.get("equity") if result.snapshot else None,
        "unrealized_pnl": result.snapshot.get("unrealized_pnl") if result.snapshot else None,
        "min_equity": result.min_equity,
        "min_equity_note": None,
        "equity_low": result.equity_low,
        "peak_balance": result.peak_balance,
        "drawdown_percent": result.drawdown_percent,
        "daily_peak_balance": result.daily_peak_balance,
        "daily_low_equity": result.daily_low_equity,
        "daily_dd_percent": result.daily_dd_percent,
        "trading_cycle_start": result.trading_cycle_start,
        "trading_cycle_source": result.trading_cycle_source,
        "total_trades": None,
        "short_trades_count": None,
        "trading_days_count": len(result.daily_pnl_summary or []),
        "trades": [],
        "positions": [],
        "timestamp": result.payload_received_at,
        "engine_id": "replay",
        "latency_ms": None,
        "breach_reason": result.breach_reason,
        "breach_balance": result.breach_balance,
        "daily_breach_balance": result.daily_breach_balance,
        "breach_event": result.breach_event,
        "trade_duration_violations": result.trade_duration_violations,
        "passed": result.passed,
        "profit_target_balance": result.profit_target_balance,
        "daily_pnl_summary": result.daily_pnl_summary,
    }
    headers = {}
    if BACKEND_ENGINE_SECRET:
        headers["X-ENGINE-SECRET"] = BACKEND_ENGINE_SECRET
    if not BACKEND_BASE_URL:
        return
    try:
        response = requests.post(
            f"{BACKEND_BASE_URL.rstrip('/')}{BACKEND_REPLAY_ENDPOINT}",
            json=payload,
            headers=headers,
            timeout=10,
        )
        if 200 <= response.status_code < 300:
            log_successful_metric_send(result=result, backend_status_code=response.status_code)
            return
        log_backend_failure(
            result=result,
            backend_status_code=response.status_code,
            response_text=response.text[:4000],
        )
    except Exception as exc:
        log_backend_failure(result=result, error=str(exc))
        return


class PositionPayload(BaseModel):
    ticket: Optional[str] = None
    position_id: Optional[str] = None
    symbol: str
    volume: float
    open_price: float
    open_time_ms: int
    type: int


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


class SymbolMetaPayload(BaseModel):
    symbol: str
    contract_size: float
    tick_value: float
    tick_size: float


class EAPayload(BaseModel):
    account_number: str
    account_type: Optional[str] = None
    challenge_type: Optional[str] = None
    phase: Optional[str] = None
    account_size: Optional[float] = None
    platform: str = "mt5"
    current_balance: float
    current_equity: float
    trading_cycle_start: Optional[str] = None
    trading_cycle_source: Optional[str] = None
    anchor_time_ms: int
    positions: List[PositionPayload] = Field(default_factory=list)
    closed_deals: List[ClosedDealPayload] = Field(default_factory=list)
    symbols: List[SymbolMetaPayload] = Field(default_factory=list)


class ReplayInputPayload(BaseModel):
    account_number: str
    account_type: Optional[str] = None
    challenge_type: Optional[str] = None
    phase: Optional[str] = None
    account_size: Optional[float] = None
    initial_balance: float
    max_dd_amount: float
    daily_dd_amount: Optional[float] = None
    profit_target_amount: Optional[float] = None
    min_trading_days_required: Optional[int] = None
    min_trade_duration_minutes: Optional[int] = None
    snapshot: Optional[dict] = None


class ReplaySession(BaseModel):
    session_id: str
    account_number: str
    ea_payload: Optional[EAPayload]
    replay_input: Optional[ReplayInputPayload]
    created_at: str
    updated_at: str
    status: str = "queued"


class ReplayResult(BaseModel):
    session_id: str
    account_number: str
    received_at: Optional[str] = None
    processing_started_at: Optional[str] = None
    processed_at: Optional[str] = None
    processing_duration_ms: Optional[float] = None
    breach_reason: Optional[str]
    breach_balance: float
    daily_breach_balance: Optional[float]
    min_equity: float
    equity_low: float
    peak_balance: float
    drawdown_percent: Optional[float]
    daily_dd_percent: Optional[float]
    trading_cycle_start: Optional[str]
    trading_cycle_source: Optional[str]
    breach_event: Optional[dict] = None
    trade_duration_violations: List[dict] = Field(default_factory=list)
    daily_peak_balance: Optional[float] = None
    daily_low_equity: Optional[float] = None
    daily_pnl_summary: List[dict] = Field(default_factory=list)
    profit: float = 0.0
    snapshot: Optional[dict] = None
    passed: bool = False
    profit_target_balance: Optional[float] = None
    payload_received_at: str


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


SESSIONS: Dict[str, ReplaySession] = {}


def get_account_processing_lock(account_number: str) -> Lock:
    with account_lock_registry_guard:
        existing = account_lock_registry.get(account_number)
        if existing is not None:
            return existing
        created = Lock()
        account_lock_registry[account_number] = created
        return created


def _session_key(session_id: str) -> str:
    return f"{REPLAY_SESSION_PREFIX}{session_id}"


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
    session: ReplaySession,
    *,
    status: Optional[str] = None,
    result: Optional[ReplayResult] = None,
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
    return {
        "session": session.model_dump(mode="json"),
        "status": session.status,
        "error": None,
        "result": None,
    }


def enqueue_session(session: ReplaySession) -> None:
    save_session_record(session, status="queued")
    client = get_redis_client()
    if client:
        client.lpush(REPLAY_QUEUE_KEY, session.session_id)
    else:
        raise HTTPException(status_code=503, detail="Replay queue is unavailable")


def replay_worker_loop() -> None:
    client = get_redis_client()
    if not client:
        return
    while not worker_stop_event.is_set():
        try:
            job = client.brpop(REPLAY_QUEUE_KEY, timeout=5)
            if not job:
                continue
            _, session_id = job
            record = load_session_record(session_id)
            if not record:
                continue
            session = ReplaySession.model_validate(record["session"])
            account_lock = get_account_processing_lock(session.account_number)
            with account_lock:
                save_session_record(session, status="processing")
                result = calculate_result(session)
                save_session_record(session, status="completed", result=result)
        except Exception as exc:
            try:
                if 'session' in locals():
                    save_session_record(session, status="failed", error=str(exc))
            except Exception:
                pass


def build_replay_input_from_payload(payload: EAPayload) -> ReplayInputPayload:
    rules = resolve_rules(payload)
    base_balance = float(payload.account_size or rules.get("account_size", payload.current_balance))
    max_dd_amount = base_balance * float(rules.get("max_drawdown_pct", 0)) / 100
    daily_dd_amount = base_balance * float(rules.get("daily_drawdown_pct", 0)) / 100
    profit_target_amount = base_balance * float(rules.get("profit_target_pct", 0)) / 100
    return ReplayInputPayload(
        account_number=payload.account_number,
        account_type=payload.account_type,
        challenge_type=payload.challenge_type,
        phase=payload.phase,
        account_size=payload.account_size,
        initial_balance=base_balance,
        max_dd_amount=max_dd_amount,
        daily_dd_amount=daily_dd_amount,
        profit_target_amount=profit_target_amount,
        min_trading_days_required=int(rules.get("min_trading_days", 0) or 0),
        min_trade_duration_minutes=int(rules.get("min_trade_duration_minutes", 0) or 0),
        snapshot={"time_limit_hours": rules.get("time_limit_hours")},
    )


@app.on_event("startup")
def startup_event() -> None:
    client = get_redis_client()
    if not client:
        return
    worker_stop_event.clear()
    worker_threads.clear()
    for index in range(REPLAY_WORKER_COUNT):
        worker = Thread(target=replay_worker_loop, name=f"replay-worker-{index + 1}", daemon=True)
        worker.start()
        worker_threads.append(worker)
    return


@app.on_event("shutdown")
def shutdown_event() -> None:
    worker_stop_event.set()

ACCOUNT_RULES = {
    "one_step_phase_1": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 10,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "one_step_funded": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 0,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "two_step_phase_1": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 10,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "two_step_phase_2": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 5,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "two_step_funded": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 0,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "instant_funded": {
        "max_drawdown_pct": 5,
        "daily_drawdown_pct": 2,
        "profit_target_pct": 0,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 5,
    },
    "ngn_standard_phase_1": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 10,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "ngn_standard_phase_2": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 5,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "ngn_standard_funded": {
        "max_drawdown_pct": 11,
        "daily_drawdown_pct": 5,
        "profit_target_pct": 0,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 1,
    },
    "ngn_flexi_phase_1": {
        "max_drawdown_pct": 20,
        "daily_drawdown_pct": 0,
        "profit_target_pct": 10,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 0,
    },
    "ngn_flexi_phase_2": {
        "max_drawdown_pct": 20,
        "daily_drawdown_pct": 0,
        "profit_target_pct": 10,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 0,
    },
    "ngn_flexi_funded": {
        "max_drawdown_pct": 20,
        "daily_drawdown_pct": 0,
        "profit_target_pct": 0,
        "min_trade_duration_minutes": 3,
        "min_trading_days": 0,
    },
    "attic_phase_1": {
        "max_drawdown_pct": 20,
        "daily_drawdown_pct": 0,
        "profit_target_pct": 30,
        "min_trade_duration_minutes": 0,
        "min_trading_days": 0,
        "time_limit_hours": 24,
    },
}


def resolve_rules(payload: EAPayload) -> dict:
    account_type = (payload.account_type or "").strip().lower()
    if account_type and account_type in ACCOUNT_RULES:
        return {"account_type": account_type, **ACCOUNT_RULES[account_type]}

    challenge_type = (payload.challenge_type or "").strip().lower()
    phase = (payload.phase or "").strip().lower()
    combined = f"{challenge_type}_{phase}".strip("_")
    if combined and combined in ACCOUNT_RULES:
        return {"account_type": combined, **ACCOUNT_RULES[combined]}

    raise HTTPException(status_code=400, detail="Unknown or missing account_type for replay rules")


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _deal_is_withdrawal(deal: ClosedDealPayload) -> bool:
    return str(deal.deal_type or "").upper() in {"WITHDRAWAL", "WITHDRAW"}


def _deal_is_deposit(deal: ClosedDealPayload) -> bool:
    return str(deal.deal_type or "").upper() in {"DEPOSIT"}


def _is_balance_symbol(deal: ClosedDealPayload) -> bool:
    return str(deal.symbol or "").upper() == "BALANCE"


def _should_ignore_deal(deal: ClosedDealPayload) -> bool:
    return _deal_is_deposit(deal) or _deal_is_withdrawal(deal) or _is_balance_symbol(deal)


def _resolve_cycle_start(payload: EAPayload) -> tuple[Optional[str], Optional[str], Optional[int]]:
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
        return (
            datetime.utcfromtimestamp(first_deposit.time_ms / 1000).isoformat() + "Z",
            "deposit",
            first_deposit.time_ms,
        )
    return (payload.trading_cycle_start, payload.trading_cycle_source, payload.anchor_time_ms)


def _resolve_time_limit_start_ms(payload: EAPayload, cycle_start_ms: Optional[int]) -> int:
    account_type = str(payload.account_type or "").strip().lower()
    challenge_type = str(payload.challenge_type or "").strip().lower()
    is_attic = account_type == "attic_phase_1" or challenge_type == "attic"
    if not is_attic:
        return cycle_start_ms or payload.anchor_time_ms

    first_trade_candidates: List[int] = []
    cycle_floor_ms = cycle_start_ms or payload.anchor_time_ms

    for deal in payload.closed_deals:
        if _should_ignore_deal(deal):
            continue
        if deal.time_ms >= cycle_floor_ms:
            first_trade_candidates.append(deal.time_ms)

    for position in payload.positions:
        if position.open_time_ms >= cycle_floor_ms:
            first_trade_candidates.append(position.open_time_ms)

    if first_trade_candidates:
        return min(first_trade_candidates)

    return cycle_floor_ms


def _is_attic_payload(payload: EAPayload) -> bool:
    account_type = str(payload.account_type or "").strip().lower()
    challenge_type = str(payload.challenge_type or "").strip().lower()
    return account_type == "attic_phase_1" or challenge_type == "attic"


def _symbol_meta_map(payload: EAPayload) -> Dict[str, SymbolMetaPayload]:
    return {meta.symbol: meta for meta in payload.symbols}


def _unsupported_symbols(symbols: List[str]) -> List[str]:
    return sorted(symbol for symbol in symbols if symbol not in SUPPORTED_MARKET_SYMBOLS)


def _deal_net(deal: ClosedDealPayload) -> float:
    return deal.profit + deal.commission + deal.swap


def _position_key(position_id: Optional[str], ticket: Optional[str], symbol: str, open_time_ms: int) -> str:
    return position_id or ticket or f"{symbol}:{open_time_ms}"


def _deal_affects_balance(deal: ClosedDealPayload) -> bool:
    return _deal_is_deposit(deal) or _deal_is_withdrawal(deal)


def _pnl_from_ticks(
    position: PositionPayload,
    tick: dict,
    meta: SymbolMetaPayload,
) -> float:
    price = tick.get("bid") if position.type == 0 else tick.get("ask")
    if price is None:
        return 0.0
    price_diff = price - position.open_price if position.type == 0 else position.open_price - price
    if meta.tick_value > 0 and meta.tick_size > 0:
        ticks = price_diff / meta.tick_size
        return ticks * meta.tick_value * position.volume

    if meta.contract_size > 0:
        return price_diff * meta.contract_size * position.volume

    if meta.tick_size == 0:
        return 0.0
    return 0.0


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
        except requests.Timeout as exc:
            ticks_by_symbol[symbol] = []
            fetch_issues[symbol] = {
                "type": "timeout",
                "message": str(exc),
                "start_ms": start_ms,
                "end_ms": end_ms,
            }
        except requests.RequestException as exc:
            ticks_by_symbol[symbol] = []
            fetch_issues[symbol] = {
                "type": "request_error",
                "message": str(exc),
                "start_ms": start_ms,
                "end_ms": end_ms,
            }
    return ticks_by_symbol, fetch_issues


def replay_anchor_end_ms(payload: EAPayload) -> int:
    latest = payload.anchor_time_ms
    for deal in payload.closed_deals:
        latest = max(latest, deal.time_ms)
    for position in payload.positions:
        latest = max(latest, position.open_time_ms)
    return max(latest, int(datetime.utcnow().timestamp() * 1000))


def _build_structural_events(payload: EAPayload) -> List[tuple]:
    events: List[tuple] = []
    for position in payload.positions:
        events.append(("open", position.open_time_ms, position))
    for deal in payload.closed_deals:
        events.append(("deal", deal.time_ms, deal))
    events.sort(key=lambda item: (item[1], EVENT_ORDER.get(item[0], 9)))
    return events


def build_timeline(
    payload: EAPayload,
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
    open_time_map: Dict[str, int] = {}
    for position in payload.positions:
        if position.open_time_ms <= payload.anchor_time_ms:
            key = _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms)
            open_positions[key] = position
            open_time_map[key] = position.open_time_ms

    balance = initial_balance
    peak_balance = balance

    last_ticks: Dict[str, dict] = {}
    snapshots: List[dict] = []

    def snapshot_at(time_ms: int, event: Optional[dict] = None) -> None:
        equity = balance
        position_contributions: List[dict] = []
        for position in open_positions.values():
            tick = last_ticks.get(position.symbol)
            meta = meta_map.get(position.symbol)
            if tick and meta:
                pnl = _pnl_from_ticks(position, tick, meta)
                equity += pnl
                position_contributions.append(
                    {
                        "position_id": position.position_id,
                        "ticket": position.ticket,
                        "symbol": position.symbol,
                        "open_time_ms": position.open_time_ms,
                        "floating_pnl": pnl,
                    }
                )
        largest_loss_trade = None
        if position_contributions:
            largest_loss_trade = min(position_contributions, key=lambda item: item["floating_pnl"])
        snapshots.append(
            {
                "time_ms": time_ms,
                "equity": equity,
                "balance": balance,
                "event": event,
                "largest_loss_trade": largest_loss_trade,
            }
        )

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
            open_positions[key] = position
            open_time_map[key] = position.open_time_ms
            event_meta.update({"symbol": position.symbol, "position_id": position.position_id, "ticket": position.ticket})
        elif event_type == "deal":
            deal = event[2]
            ignored_deal = _should_ignore_deal(deal)
            event_meta.update({
                "symbol": deal.symbol,
                "deal_type": deal.deal_type,
                "entry": deal.entry,
                "ignored": ignored_deal,
            })
            if ignored_deal:
                if deal.time_ms != payload.anchor_time_ms:
                    balance = initial_balance
                    if balance > peak_balance:
                        peak_balance = balance
            elif deal.entry == 0:
                position = PositionPayload(
                    ticket=deal.position_id,
                    position_id=deal.position_id,
                    symbol=deal.symbol,
                    volume=deal.volume,
                    open_price=deal.price,
                    open_time_ms=deal.time_ms,
                    type=deal.type,
                )
                key = _position_key(position.position_id, position.ticket, position.symbol, position.open_time_ms)
                open_positions[key] = position
                open_time_map[key] = position.open_time_ms
                event_meta.update({"position_id": deal.position_id, "deal_id": deal.deal_id})
            elif deal.entry == 1:
                balance += _deal_net(deal)
                if balance > peak_balance:
                    peak_balance = balance
                key = deal.position_id or deal.deal_id
                if key in open_positions:
                    open_positions.pop(key, None)
                open_time = open_time_map.pop(key, None)
                if open_time is not None:
                    duration_min = (deal.time_ms - open_time) / 60000.0
                    event_meta["duration_min"] = duration_min
                event_meta.update({
                    "position_id": deal.position_id,
                    "deal_id": deal.deal_id,
                    "profit": _deal_net(deal),
                })
        elif event_type == "tick":
            symbol = event[2]
            tick = event[3]
            last_ticks[symbol] = tick
            event_meta.update({"symbol": symbol})

        snapshot_at(time_ms, event_meta)

    return snapshots


def enrich_breach_trade_details(*, payload: EAPayload, breach_event: Optional[dict]) -> Optional[dict]:
    if not breach_event:
        return breach_event

    breach_time_ms = breach_event.get("time_ms")
    loss_trade = breach_event.get("largest_loss_trade")
    if not breach_time_ms or not isinstance(loss_trade, dict):
        return breach_event

    position_id = loss_trade.get("position_id")
    ticket = loss_trade.get("ticket")
    symbol = loss_trade.get("symbol")
    open_time_ms = loss_trade.get("open_time_ms")

    if open_time_ms is not None:
        breach_event["breach_trade_duration_min"] = round((breach_time_ms - open_time_ms) / 60000.0, 4)

    breach_event["breach_trade"] = {
        "position_id": position_id,
        "ticket": ticket,
        "symbol": symbol,
        "open_time_ms": open_time_ms,
        "floating_pnl_at_breach": loss_trade.get("floating_pnl"),
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
        }
    else:
        breach_event["breach_trade_close"] = {
            "closed_at_breach": False,
            "closed_after_breach": False,
        }

    breach_event.pop("largest_loss_trade", None)
    return breach_event


def calculate_result(session: ReplaySession) -> ReplayResult:
    processing_started_at = now_iso()
    started_at = time.perf_counter()
    if not session.ea_payload:
        raise HTTPException(status_code=400, detail="EA payload not found for session")
    if not session.replay_input:
        raise HTTPException(status_code=400, detail="Replay input not found for session")

    payload = session.ea_payload
    replay = session.replay_input

    cycle_start, cycle_source, _cycle_start_ms = _resolve_cycle_start(payload)
    time_limit_start_ms = _resolve_time_limit_start_ms(payload, _cycle_start_ms)
    reported_cycle_start = cycle_start
    reported_cycle_source = cycle_source
    if _is_attic_payload(payload) and time_limit_start_ms:
        reported_cycle_start = datetime.utcfromtimestamp(time_limit_start_ms / 1000).isoformat() + "Z"
        reported_cycle_source = "first_trade"
    symbols = sorted(
        {pos.symbol for pos in payload.positions}
        | {deal.symbol for deal in payload.closed_deals if not _should_ignore_deal(deal)}
    )
    unsupported_symbols = _unsupported_symbols(symbols)
    if unsupported_symbols:
        processed_at = now_iso()
        result = ReplayResult(
            session_id=session.session_id,
            account_number=session.account_number,
            received_at=session.created_at,
            processing_started_at=processing_started_at,
            processed_at=processed_at,
            processing_duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
            breach_reason="UNSUPPORTED_SYMBOL",
            breach_balance=replay.initial_balance - replay.max_dd_amount,
            daily_breach_balance=(replay.initial_balance - replay.daily_dd_amount) if replay.daily_dd_amount is not None and replay.daily_dd_amount > 0 else None,
            min_equity=payload.current_equity,
            equity_low=payload.current_equity,
            peak_balance=replay.initial_balance,
            drawdown_percent=((replay.initial_balance - payload.current_equity) / replay.initial_balance) * 100 if replay.initial_balance > 0 else None,
            daily_dd_percent=((replay.initial_balance - payload.current_equity) / replay.initial_balance) * 100 if replay.initial_balance > 0 and replay.daily_dd_amount is not None and replay.daily_dd_amount > 0 else None,
            trading_cycle_start=reported_cycle_start,
            trading_cycle_source=reported_cycle_source,
            breach_event={
                "type": "unsupported_symbol",
                "symbols": unsupported_symbols,
                "time_ms": payload.anchor_time_ms,
            },
            trade_duration_violations=[],
            daily_peak_balance=replay.initial_balance,
            daily_low_equity=payload.current_equity,
            daily_pnl_summary=[],
            profit=0.0,
            snapshot={
                "balance": payload.current_balance,
                "equity": payload.current_equity,
                "peak_balance": replay.initial_balance,
                "min_equity": payload.current_equity,
                "daily_peak_balance": replay.initial_balance,
                "daily_low_equity": payload.current_equity,
            },
            passed=False,
            profit_target_balance=(replay.initial_balance + replay.profit_target_amount) if replay.profit_target_amount is not None else None,
            payload_received_at=session.created_at,
        )
        notify_backend(result)
        return result
    meta_map = _symbol_meta_map(payload)
    ticks_by_symbol, tick_fetch_issues = _ticks_for_symbols(symbols, payload.anchor_time_ms, replay_anchor_end_ms(payload))
    ensure_replay_inputs_are_complete(
        payload=payload,
        symbols=symbols,
        meta_map=meta_map,
        ticks_by_symbol=ticks_by_symbol,
        tick_fetch_issues=tick_fetch_issues,
    )

    peak_balance = replay.initial_balance
    daily_peak_balance = replay.initial_balance
    daily_start_balance = replay.initial_balance
    daily_low_equity = float("inf")
    daily_dd_percent = None
    min_equity = float("inf")
    breach_reason = None
    breach_event: Optional[dict] = None
    trade_duration_violations: List[dict] = []
    passed = False
    pass_event: Optional[dict] = None
    realized_profit = 0.0

    current_day = None
    daily_pnl_map: Dict[str, float] = {}
    replay_snapshot = getattr(replay, "snapshot", None)
    time_limit_hours = replay_snapshot.get("time_limit_hours") if isinstance(replay_snapshot, dict) else None
    timeline = build_timeline(payload, ticks_by_symbol, meta_map, replay.initial_balance)
    for snapshot in timeline:
        equity = snapshot["equity"]
        ts = snapshot["time_ms"]
        balance_snapshot = snapshot.get("balance", replay.initial_balance)
        event = snapshot.get("event", {})
        event_type = event.get("type")

        day_key = datetime.utcfromtimestamp(ts / 1000).date()
        day_key_str = day_key.isoformat()
        if event_type == "deal" and event.get("ignored"):
            peak_balance = replay.initial_balance
            daily_peak_balance = replay.initial_balance
            daily_start_balance = replay.initial_balance
            daily_low_equity = float("inf")
            min_equity = float("inf")
            current_day = day_key

        if balance_snapshot > peak_balance:
            peak_balance = balance_snapshot
        if current_day is None or day_key != current_day:
            current_day = day_key
            daily_start_balance = balance_snapshot
            daily_peak_balance = balance_snapshot
            daily_low_equity = float("inf")
        else:
            if balance_snapshot > daily_peak_balance:
                daily_peak_balance = balance_snapshot

        if event_type == "deal" and event.get("entry") == 1 and not event.get("ignored"):
            min_duration = replay.min_trade_duration_minutes or 0
            duration_min = event.get("duration_min")
            if min_duration and duration_min is not None and duration_min < min_duration:
                trade_duration_violations.append(
                    {
                        "position_id": event.get("position_id"),
                        "deal_id": event.get("deal_id"),
                        "symbol": event.get("symbol"),
                        "duration_min": duration_min,
                        "closed_time_ms": ts,
                    }
                )
                if len(trade_duration_violations) >= 3 and breach_reason is None:
                    breach_reason = "MIN_TRADE_DURATION"
                    breach_event = {"violations": trade_duration_violations[:3]}
                    break
            profit = event.get("profit")
            if profit is None:
                profit = 0.0
            realized_profit += float(profit)
            daily_pnl_map[day_key_str] = daily_pnl_map.get(day_key_str, 0.0) + float(profit)

            if breach_reason is None and replay.profit_target_amount:
                if realized_profit >= replay.profit_target_amount:
                    passed = True
                    pass_event = {
                        "type": "profit_target_reached",
                        "realized_profit": realized_profit,
                        "balance": balance_snapshot,
                        "time_ms": ts,
                    }
                    break

        if breach_reason is None and time_limit_hours:
            elapsed_hours = max(0.0, (ts - time_limit_start_ms) / 3_600_000)
            if elapsed_hours > float(time_limit_hours) and not passed:
                breach_reason = "TIME_LIMIT"
                breach_event = {
                    "type": "time_limit",
                    "time_ms": ts,
                    "time_limit_start_ms": time_limit_start_ms,
                    "elapsed_hours": elapsed_hours,
                    "limit_hours": float(time_limit_hours),
                }
                break

        if event_type != "tick":
            continue

        if equity < daily_low_equity:
            daily_low_equity = equity
        if equity < min_equity:
            min_equity = equity

        breach_balance = peak_balance - replay.max_dd_amount
        daily_breach_balance = None
        if replay.daily_dd_amount is not None and replay.daily_dd_amount > 0:
            daily_breach_balance = daily_start_balance - replay.daily_dd_amount
        if breach_reason is None:
            if daily_breach_balance is not None and equity < daily_breach_balance:
                breach_reason = "DAILY_DRAWDOWN"
                breach_event = snapshot.get("event")
                if breach_event is not None:
                    breach_event["equity"] = equity
                    breach_event["balance"] = balance_snapshot
                    if snapshot.get("largest_loss_trade") is not None:
                        breach_event["largest_loss_trade"] = snapshot.get("largest_loss_trade")
                break
            if equity < breach_balance:
                breach_reason = "MAX_DRAWDOWN"
                breach_event = snapshot.get("event")
                if breach_event is not None:
                    breach_event["equity"] = equity
                    breach_event["balance"] = balance_snapshot
                    if snapshot.get("largest_loss_trade") is not None:
                        breach_event["largest_loss_trade"] = snapshot.get("largest_loss_trade")
                break
            # Profit target is only evaluated on realized PnL (closed deals), not floating equity.

    breach_balance = peak_balance - replay.max_dd_amount
    daily_breach_balance = None
    if replay.daily_dd_amount is not None and replay.daily_dd_amount > 0:
        daily_breach_balance = daily_start_balance - replay.daily_dd_amount
        if daily_start_balance > 0 and daily_low_equity != float("inf"):
            daily_dd_percent = ((daily_start_balance - daily_low_equity) / daily_start_balance) * 100

    if min_equity == float("inf"):
        min_equity = replay.initial_balance
    if daily_low_equity == float("inf"):
        daily_low_equity = min_equity

    daily_pnl_summary = [
        {"date": date_key, "pnl": pnl}
        for date_key, pnl in sorted(daily_pnl_map.items())
    ]

    total_profit = sum(daily_pnl_map.values()) if daily_pnl_map else 0.0

    drawdown_percent = ((peak_balance - min_equity) / peak_balance) * 100 if peak_balance > 0 else None

    profit_target_balance = None
    if replay.profit_target_amount is not None:
        profit_target_balance = replay.initial_balance + replay.profit_target_amount

    if breach_reason is None:
        end_breach_balance = peak_balance - replay.max_dd_amount
        end_daily_breach_balance = None
        if replay.daily_dd_amount is not None and replay.daily_dd_amount > 0:
            end_daily_breach_balance = daily_start_balance - replay.daily_dd_amount

        if end_daily_breach_balance is not None and payload.current_equity < end_daily_breach_balance:
            log_replay_diagnostic(
                account_number=payload.account_number,
                issue="final_snapshot_daily_breach",
                details={
                    "equity": payload.current_equity,
                    "balance": payload.current_balance,
                    "daily_breach_balance": end_daily_breach_balance,
                    "daily_start_balance": daily_start_balance,
                    "timeline_events": len(timeline),
                },
            )
            breach_reason = "DAILY_DRAWDOWN"
            breach_event = {
                "type": "final_snapshot",
                "equity": payload.current_equity,
                "balance": payload.current_balance,
            }
        elif payload.current_equity < end_breach_balance:
            log_replay_diagnostic(
                account_number=payload.account_number,
                issue="final_snapshot_max_breach",
                details={
                    "equity": payload.current_equity,
                    "balance": payload.current_balance,
                    "breach_balance": end_breach_balance,
                    "peak_balance": peak_balance,
                    "timeline_events": len(timeline),
                },
            )
            breach_reason = "MAX_DRAWDOWN"
            breach_event = {
                "type": "final_snapshot",
                "equity": payload.current_equity,
                "balance": payload.current_balance,
            }
    if breach_reason is not None:
        passed = False
        pass_event = None

    breach_event = enrich_breach_trade_details(payload=payload, breach_event=breach_event)

    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
    processed_at = now_iso()

    result = ReplayResult(
        session_id=session.session_id,
        account_number=session.account_number,
        received_at=session.created_at,
        processing_started_at=processing_started_at,
        processed_at=processed_at,
        processing_duration_ms=elapsed_ms,
        breach_reason=breach_reason,
        breach_balance=breach_balance,
        daily_breach_balance=daily_breach_balance,
        min_equity=min_equity,
        equity_low=min_equity,
        peak_balance=peak_balance,
        drawdown_percent=drawdown_percent,
        daily_dd_percent=daily_dd_percent,
        trading_cycle_start=reported_cycle_start,
        trading_cycle_source=reported_cycle_source,
        breach_event=(breach_event or pass_event),
        trade_duration_violations=trade_duration_violations[:3],
        daily_peak_balance=daily_peak_balance,
        daily_low_equity=daily_low_equity,
        daily_pnl_summary=daily_pnl_summary,
        profit=total_profit,
        snapshot={
            "balance": payload.current_balance,
            "equity": payload.current_equity,
            "peak_balance": peak_balance,
            "min_equity": min_equity,
            "daily_peak_balance": daily_peak_balance,
            "daily_low_equity": daily_low_equity,
        },
        passed=passed,
        profit_target_balance=profit_target_balance,
        payload_received_at=session.created_at,
    )
    notify_backend(result)
    return result


@app.post("/replay/ea", response_model=ReplayEnqueueResponse, status_code=202)
async def submit_ea_payload(request: Request, payload: EAPayload):
    await request.body()
    session_id = str(uuid4())
    timestamp = now_iso()
    session = ReplaySession(
        session_id=session_id,
        account_number=payload.account_number,
        ea_payload=payload,
        replay_input=build_replay_input_from_payload(payload),
        created_at=timestamp,
        updated_at=timestamp,
        status="queued",
    )
    enqueue_session(session)
    response = ReplayEnqueueResponse(
        session_id=session_id,
        account_number=payload.account_number,
        status="queued",
        queued_at=timestamp,
    )
    return JSONResponse(status_code=202, content=response.model_dump(mode="json"))


@app.post("/replay/input", response_model=ReplaySession)
def submit_replay_input(payload: ReplayInputPayload):
    matching = next((sess for sess in SESSIONS.values() if sess.account_number == payload.account_number), None)
    timestamp = now_iso()
    if not matching:
        session_id = str(uuid4())
        session = ReplaySession(
            session_id=session_id,
            account_number=payload.account_number,
            ea_payload=None,
            replay_input=payload,
            created_at=timestamp,
            updated_at=timestamp,
        )
        SESSIONS[session_id] = session
        return session

    session = ReplaySession(
        session_id=matching.session_id,
        account_number=matching.account_number,
        ea_payload=matching.ea_payload,
        replay_input=payload,
        created_at=matching.created_at,
        updated_at=timestamp,
    )
    SESSIONS[matching.session_id] = session
    return session


@app.get("/replay/result/{session_id}", response_model=ReplayStatusResponse)
def get_replay_result(session_id: str):
    record = load_session_record(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")
    session = ReplaySession.model_validate(record["session"])
    return ReplayStatusResponse(
        session_id=session.session_id,
        account_number=session.account_number,
        status=record.get("status") or session.status,
        queued_at=session.created_at,
        updated_at=session.updated_at,
        error=record.get("error"),
        result=record.get("result"),
    )


@app.get("/replay/sessions", response_model=List[ReplaySession])
def list_sessions():
    return list(SESSIONS.values())


@app.get("/replay/ticks")
def get_ticks(symbol: str, start: int = Query(...), end: int = Query(...)):
    if end < start:
        raise HTTPException(status_code=400, detail="end must be >= start")

    def fetch_ticks(symbol_value: str):
        response = requests.get(
            f"{TICK_SERVICE_URL}/get_ticks",
            params={"symbol": symbol_value, "start": start, "end": end},
            timeout=20,
        )
        response.raise_for_status()
        return response.json()

    try:
        return fetch_ticks(symbol)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Tick service error: {exc}") from exc


@app.get("/health")
def health():
    return {"status": "ok"}
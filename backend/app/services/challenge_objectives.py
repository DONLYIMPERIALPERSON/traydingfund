from __future__ import annotations

from datetime import datetime, timezone
import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.challenge_account import ChallengeAccount
from app.models.challenge_config import ChallengeConfig
from app.models.mt5_account import MT5Account
from app.schemas.challenge_account import TradeInfo


ASSIGNED_STAGES = {"Phase 1", "Phase 2", "Funded"}
CHALLENGE_CONFIG_KEY = "public_challenge_plans"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_account_size_to_balance(account_size: str) -> float:
    normalized = account_size.lower().replace("₦", "").replace(",", "")
    match = re.search(r"(\d+(?:\.\d+)?)\s*([km]?)", normalized)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse account size: {account_size}",
        )

    value = float(match.group(1))
    suffix = match.group(2)
    if suffix == "k":
        value *= 1_000
    elif suffix == "m":
        value *= 1_000_000

    if value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid account size value: {account_size}",
        )

    return value


def _parse_number_from_text(raw: object, fallback: float = 0) -> float:
    text = str(raw or "").strip().replace(",", "")
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return fallback
    try:
        return float(match.group(1))
    except ValueError:
        return fallback


def initialize_challenge_stage_tracking(
    challenge: ChallengeAccount,
    *,
    account_size: str,
    now: datetime | None = None,
) -> None:
    ts = now or _now_utc()
    initial_balance = parse_account_size_to_balance(account_size)
    dd_amount = initial_balance * 0.20

    challenge.initial_balance = initial_balance
    challenge.dd_amount = dd_amount
    challenge.highest_balance = initial_balance
    challenge.breach_balance = initial_balance - dd_amount
    challenge.profit_target_balance = initial_balance * 1.10
    challenge.latest_balance = initial_balance
    challenge.latest_equity = initial_balance
    challenge.scalping_violations_count = 0
    challenge.objective_status = "active"
    challenge.breached_reason = None
    challenge.breached_at = None
    challenge.passed_at = None
    challenge.last_feed_at = ts
    challenge.funded_profit_raw = 0
    challenge.funded_profit_capped = 0
    challenge.funded_profit_cap_amount = 0
    challenge.funded_user_payout_amount = 0
    challenge.stage_started_at = ts
    challenge.closed_trades_count = 0
    challenge.winning_trades_count = 0
    challenge.lots_traded_total = 0
    challenge.today_closed_pnl = 0
    challenge.today_trades_count = 0
    challenge.today_lots_total = 0


def _to_percent_number(raw: object, fallback: float = 0) -> float:
    text = str(raw or "").strip().replace("%", "")
    try:
        return float(text)
    except ValueError:
        return fallback


def get_plan_for_account_size(db: Session, account_size: str) -> dict[str, object] | None:
    row = db.scalar(select(ChallengeConfig).where(ChallengeConfig.config_key == CHALLENGE_CONFIG_KEY))
    if row is None or not isinstance(row.config_value, list):
        return None

    target = account_size.strip().lower()
    for plan in row.config_value:
        plan_name = str(plan.get("name", "")).strip().lower()
        if plan_name == target:
            return plan
    return None


def get_min_trading_days_required(db: Session, account_size: str) -> float:
    plan = get_plan_for_account_size(db, account_size)
    if plan is None:
        return 0
    return max(_parse_number_from_text(plan.get("min_trading_days"), fallback=0), 0)


def get_stage_elapsed_hours(challenge: ChallengeAccount, *, now: datetime | None = None) -> float:
    if challenge.stage_started_at is None:
        return 0
    reference = now or _now_utc()
    delta = reference - challenge.stage_started_at
    return max(delta.total_seconds() / 3600, 0)


def is_min_trading_days_met(db: Session, challenge: ChallengeAccount, *, now: datetime | None = None) -> tuple[float, float, bool]:
    required_days = get_min_trading_days_required(db, challenge.account_size)
    elapsed_hours = get_stage_elapsed_hours(challenge, now=now)
    required_hours = 1
    return required_days, elapsed_hours, elapsed_hours >= required_hours


def compute_unrealized_pnl(challenge: ChallengeAccount) -> float:
    latest_balance = float(challenge.latest_balance or 0)
    latest_equity = float(challenge.latest_equity if challenge.latest_equity is not None else latest_balance)
    return round(latest_equity - latest_balance, 2)


def compute_max_permitted_loss_left(challenge: ChallengeAccount) -> float:
    latest_balance = float(challenge.latest_balance or 0)
    latest_equity = float(challenge.latest_equity if challenge.latest_equity is not None else latest_balance)
    return round(max(0, latest_equity - challenge.breach_balance), 2)


def compute_win_rate(challenge: ChallengeAccount) -> float:
    total = max(int(challenge.closed_trades_count or 0), 0)
    wins = max(int(challenge.winning_trades_count or 0), 0)
    if total <= 0:
        return 0
    return round((wins / total) * 100, 2)


def compute_funded_payout_metrics(db: Session, challenge: ChallengeAccount, balance: float) -> None:
    if challenge.current_stage != "Funded":
        challenge.funded_profit_raw = 0
        challenge.funded_profit_capped = 0
        challenge.funded_profit_cap_amount = 0
        challenge.funded_user_payout_amount = 0
        return

    raw_profit = max(balance - challenge.initial_balance, 0)

    plan = get_plan_for_account_size(db, challenge.account_size)
    profit_cap_percent = _to_percent_number(plan.get("profit_cap") if plan else "50", fallback=50)
    split_percent = _to_percent_number(plan.get("profit_split") if plan else "80", fallback=80)

    cap_amount = challenge.initial_balance * (profit_cap_percent / 100)
    capped_profit = min(raw_profit, cap_amount)
    user_payout = capped_profit * (split_percent / 100)

    challenge.funded_profit_raw = round(raw_profit, 2)
    challenge.funded_profit_cap_amount = round(cap_amount, 2)
    challenge.funded_profit_capped = round(capped_profit, 2)
    challenge.funded_user_payout_amount = round(user_payout, 2)


def _assign_next_stage_account(
    db: Session,
    *,
    challenge: ChallengeAccount,
    next_stage: str,
    now: datetime,
) -> tuple[ChallengeAccount, MT5Account] | None:
    normalized_size = challenge.account_size.replace(" Account", "").strip()
    next_mt5 = db.scalar(
        select(MT5Account)
        .where(
            MT5Account.status == "Ready",
            MT5Account.account_size.in_([normalized_size, f"{normalized_size} Account"]),
        )
        .order_by(MT5Account.id.asc())
    )

    if next_mt5 is None:
        return None

    next_mt5.status = next_stage
    next_mt5.assignment_mode = "automatic"
    next_mt5.assigned_user_id = challenge.user_id
    next_mt5.assigned_by_admin_name = "Auto"
    next_mt5.assigned_at = now
    db.add(next_mt5)

    # Create a new challenge account record for the next stage
    next_challenge = ChallengeAccount(
        user_id=challenge.user_id,
        challenge_id=f"{challenge.challenge_id}-{next_stage.lower().replace(' ', '')}",
        account_size=challenge.account_size,
        current_stage=next_stage,
        active_mt5_account_id=next_mt5.id,
    )
    db.add(next_challenge)

    # Update the MT5 account references in the new challenge record
    if next_stage == "Phase 2":
        next_challenge.phase2_mt5_account_id = next_mt5.id
    elif next_stage == "Funded":
        next_challenge.funded_mt5_account_id = next_mt5.id

    # Initialize the new challenge stage tracking
    initialize_challenge_stage_tracking(next_challenge, account_size=next_mt5.account_size, now=now)

    return next_challenge, next_mt5


def process_challenge_feed(
    db: Session,
    *,
    challenge: ChallengeAccount,
    balance: float,
    equity: float | None,
    closed_trade_durations_seconds: list[int],
    trades: list[TradeInfo] = [],
    scalping_breach_increment: int | None,
    equity_breach_signal: bool | None,
    balance_breach_signal: bool | None,
    stage_pass_signal: bool | None,
    closed_trades_count_increment: int | None,
    winning_trades_count_increment: int | None,
    lots_traded_increment: float | None,
    today_closed_pnl: float | None,
    today_trades_count: int | None,
    today_lots_total: float | None,
    observed_at: datetime | None,
) -> tuple[ChallengeAccount, str | None]:
    now = observed_at or _now_utc()

    if challenge.initial_balance <= 0:
        initialize_challenge_stage_tracking(challenge, account_size=challenge.account_size, now=now)
    elif challenge.stage_started_at is None:
        challenge.stage_started_at = now

    challenge.last_feed_at = now
    challenge.latest_balance = balance
    challenge.latest_equity = equity if equity is not None else balance

    if balance > challenge.highest_balance:
        challenge.highest_balance = balance

    challenge.breach_balance = challenge.highest_balance - challenge.dd_amount
    compute_funded_payout_metrics(db, challenge, balance)

    if trades:
        fast_trade_count = sum(
            1 for trade in trades
            if (trade.close_time - trade.open_time).total_seconds() < settings.challenge_scalping_min_seconds
        )
    elif scalping_breach_increment is not None:
        fast_trade_count = scalping_breach_increment
    else:
        fast_trade_count = sum(
            1 for duration in closed_trade_durations_seconds
            if duration < settings.challenge_scalping_min_seconds
        )

    challenge.closed_trades_count += max(closed_trades_count_increment or 0, 0)
    challenge.winning_trades_count += max(winning_trades_count_increment or 0, 0)
    challenge.lots_traded_total += max(lots_traded_increment or 0, 0)

    if today_closed_pnl is not None:
        challenge.today_closed_pnl = round(today_closed_pnl, 2)
    if today_trades_count is not None:
        challenge.today_trades_count = max(today_trades_count, 0)
    if today_lots_total is not None:
        challenge.today_lots_total = max(today_lots_total, 0)

    if fast_trade_count > 0:
        challenge.scalping_violations_count += fast_trade_count

    if challenge.objective_status == "active":
        if equity_breach_signal is True:
            challenge.objective_status = "breached"
            challenge.breached_reason = "equity_signal"
            challenge.breached_at = now
            db.add(challenge)
            return challenge, None

        if balance_breach_signal is True:
            challenge.objective_status = "breached"
            challenge.breached_reason = "balance_signal"
            challenge.breached_at = now
            db.add(challenge)
            return challenge, None

        if challenge.latest_equity is not None and challenge.latest_equity < challenge.breach_balance:
            challenge.objective_status = "breached"
            challenge.breached_reason = "drawdown_limit"
            challenge.breached_at = now
            db.add(challenge)
            return challenge, None

        if challenge.scalping_violations_count >= settings.challenge_scalping_max_violations:
            challenge.objective_status = "breached"
            challenge.breached_reason = "scalping_rule"
            challenge.breached_at = now
            db.add(challenge)
            return challenge, None

        _, _, min_days_met = is_min_trading_days_met(db, challenge, now=now)
        should_pass_from_engine = stage_pass_signal is True
        should_pass_from_backend = stage_pass_signal is None and challenge.highest_balance >= challenge.profit_target_balance

        if challenge.current_stage in {"Phase 1", "Phase 2"} and min_days_met and (should_pass_from_engine or should_pass_from_backend):
            passed_stage = challenge.current_stage
            challenge.objective_status = "passed"
            challenge.passed_stage = passed_stage
            challenge.passed_at = now

            next_stage = "Phase 2" if passed_stage == "Phase 1" else "Funded"
            next_stage_result = _assign_next_stage_account(db, challenge=challenge, next_stage=next_stage, now=now)
            if next_stage_result is None:
                challenge.objective_status = "awaiting_next_stage_account"
                db.add(challenge)
                return challenge, None

            next_challenge, next_mt5 = next_stage_result
            db.add(challenge)
            return next_challenge, next_stage

    db.add(challenge)
    return challenge, None


def rollover_funded_account_after_withdrawal(
    db: Session,
    *,
    challenge: ChallengeAccount,
    now: datetime | None = None,
) -> tuple[MT5Account, MT5Account]:
    if challenge.current_stage != "Funded":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge is not in funded stage")

    ts = now or _now_utc()
    active = db.get(MT5Account, challenge.active_mt5_account_id)
    if active is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active funded MT5 account not found")

    normalized_size = challenge.account_size.replace(" Account", "").strip()
    replacement = db.scalar(
        select(MT5Account)
        .where(
            MT5Account.status == "Ready",
            MT5Account.account_size.in_([normalized_size, f"{normalized_size} Account"]),
        )
        .order_by(MT5Account.id.asc())
    )
    if replacement is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No replacement funded account available in Ready inventory",
        )

    active.status = "Withdrawn"
    active.assignment_mode = "automatic"
    active.assigned_by_admin_name = "Auto"
    active.assigned_at = ts
    db.add(active)

    replacement.status = "Funded"
    replacement.assignment_mode = "automatic"
    replacement.assigned_user_id = challenge.user_id
    replacement.assigned_by_admin_name = "Auto"
    replacement.assigned_at = ts
    db.add(replacement)

    challenge.last_withdrawn_mt5_account_id = active.id
    challenge.funded_mt5_account_id = replacement.id
    challenge.active_mt5_account_id = replacement.id
    challenge.withdrawal_count += 1
    initialize_challenge_stage_tracking(challenge, account_size=replacement.account_size, now=ts)
    challenge.current_stage = "Funded"
    db.add(challenge)

    return active, replacement

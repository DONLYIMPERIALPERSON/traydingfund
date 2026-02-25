from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.core.config import settings
from app.core.pin_security import generate_otp_code, hash_secret, verify_secret
from app.db.deps import get_db
from app.models.challenge_config import ChallengeConfig
from app.models.pin_otp import PinOtp
from app.models.user import User
from app.schemas.challenge_config import ChallengeConfigUpdateRequest, HeroStatsUpdateRequest
from app.tasks import send_admin_settings_otp_email
from app.core.redis import redis_client
import json
from slowapi import Limiter
limiter = Limiter(key_func=lambda: "public")


router = APIRouter(tags=["Challenge Config"])

CHALLENGE_CONFIG_KEY = "public_challenge_plans"
HERO_STATS_CONFIG_KEY = "public_hero_payout_stats"

DEFAULT_PLANS: list[dict[str, object]] = [
    {
        "id": "200k",
        "name": "₦200k Account",
        "price": "₦8,900",
        "max_drawdown": "20%",
        "profit_target": "10%",
        "phases": "2",
        "min_trading_days": "1",
        "profit_split": "70%",
        "profit_cap": "100%",
        "payout_frequency": "24hr",
        "status": "Available",
        "enabled": True,
    },
    {
        "id": "400k",
        "name": "₦400k Account",
        "price": "₦18,500",
        "max_drawdown": "20%",
        "profit_target": "10%",
        "phases": "2",
        "min_trading_days": "1",
        "profit_split": "70%",
        "profit_cap": "100%",
        "payout_frequency": "24hr",
        "status": "Available",
        "enabled": True,
    },
    {
        "id": "600k",
        "name": "₦600k Account",
        "price": "₦28,000",
        "max_drawdown": "20%",
        "profit_target": "10%",
        "phases": "2",
        "min_trading_days": "1",
        "profit_split": "70%",
        "profit_cap": "100%",
        "payout_frequency": "24hr",
        "status": "Available",
        "enabled": True,
    },
    {
        "id": "800k",
        "name": "₦800k Account",
        "price": "₦38,000",
        "max_drawdown": "20%",
        "profit_target": "10%",
        "phases": "2",
        "min_trading_days": "1",
        "profit_split": "70%",
        "profit_cap": "100%",
        "payout_frequency": "24hr",
        "status": "Available",
        "enabled": True,
    },
    {
        "id": "1.5m",
        "name": "₦1.5m Account",
        "price": "₦99,000",
        "max_drawdown": "20%",
        "profit_target": "10%",
        "phases": "2",
        "min_trading_days": "1",
        "profit_split": "70%",
        "profit_cap": "50%",
        "payout_frequency": "24hr",
        "status": "Available",
        "enabled": True,
    },
    {
        "id": "3m",
        "name": "₦3m Account",
        "price": "₦180,000",
        "max_drawdown": "20%",
        "profit_target": "10%",
        "phases": "2",
        "min_trading_days": "1",
        "profit_split": "70%",
        "profit_cap": "50%",
        "payout_frequency": "24hr",
        "status": "Paused",
        "enabled": False,
    },
]

DEFAULT_HERO_STATS: dict[str, str] = {
    "total_paid_out": "1000000000",
    "paid_this_month": "97999480",
    "paid_today": "11551014",
    "trusted_traders": "50000",
}

ADMIN_CHALLENGE_OTP_PURPOSE = "admin_challenge_cfg"


def _get_or_seed_config(db: Session) -> ChallengeConfig:
    row = db.scalar(select(ChallengeConfig).where(ChallengeConfig.config_key == CHALLENGE_CONFIG_KEY))
    if row is not None:
        return row

    row = ChallengeConfig(config_key=CHALLENGE_CONFIG_KEY, config_value=DEFAULT_PLANS)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _get_or_seed_hero_stats_config(db: Session) -> ChallengeConfig:
    row = db.scalar(select(ChallengeConfig).where(ChallengeConfig.config_key == HERO_STATS_CONFIG_KEY))
    if row is not None:
        return row

    row = ChallengeConfig(config_key=HERO_STATS_CONFIG_KEY, config_value=DEFAULT_HERO_STATS)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _normalize_hero_stats(raw_value: dict[str, object] | list[dict[str, object]]) -> dict[str, str]:
    if not isinstance(raw_value, dict):
        return DEFAULT_HERO_STATS.copy()

    normalized = DEFAULT_HERO_STATS.copy()
    for key in normalized:
        if key in raw_value:
            normalized[key] = str(raw_value[key])

    return normalized


def _validate_and_consume_admin_otp(db: Session, user_id: int, otp: str) -> None:
    otp_row = db.scalar(
        select(PinOtp)
        .where(
            PinOtp.user_id == user_id,
            PinOtp.purpose == ADMIN_CHALLENGE_OTP_PURPOSE,
            PinOtp.consumed_at.is_(None),
        )
        .order_by(PinOtp.id.desc())
    )

    if otp_row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP not found for this action")

    if otp_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

    if not verify_secret(otp, otp_row.code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    otp_row.consumed_at = datetime.now(timezone.utc)
    db.add(otp_row)


@router.get("/public/challenges/config")
@limiter.limit("60/minute")
def get_public_challenge_config(request: Request, db: Session = Depends(get_db)) -> dict[str, list[dict[str, object]]]:
    cache_key = "public_challenge_config"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    row = _get_or_seed_config(db)
    public_plans = [
        plan
        for plan in row.config_value
        if bool(plan.get("enabled", True)) and str(plan.get("status", "Available")) == "Available"
    ]
    result = {"plans": public_plans}
    redis_client.setex(cache_key, 300, json.dumps(result))
    return result


@router.get("/public/hero/stats")
@limiter.limit("60/minute")
def get_public_hero_stats(request: Request, db: Session = Depends(get_db)) -> dict[str, dict[str, str]]:
    cache_key = "public_hero_stats"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    row = _get_or_seed_hero_stats_config(db)
    result = {"stats": _normalize_hero_stats(row.config_value)}
    redis_client.setex(cache_key, 300, json.dumps(result))
    return result


@router.get("/admin/challenges/config")
def get_admin_challenge_config(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, object]]]:
    row = _get_or_seed_config(db)
    return {"plans": row.config_value}


@router.get("/admin/hero/stats")
def get_admin_hero_stats(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, dict[str, str]]:
    row = _get_or_seed_hero_stats_config(db)
    return {"stats": _normalize_hero_stats(row.config_value)}


@router.post("/admin/challenges/config/send-otp")
def send_admin_challenge_config_otp(
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    code = generate_otp_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.pin_otp_expiry_minutes)

    otp_row = PinOtp(
        user_id=current_admin.id,
        purpose=ADMIN_CHALLENGE_OTP_PURPOSE,
        code_hash=hash_secret(code),
        expires_at=expires_at,
    )

    db.add(otp_row)
    send_admin_settings_otp_email.delay(to_email=current_admin.email, otp_code=code)
    db.commit()

    return {"message": "OTP sent. Check your admin email."}


@router.put("/admin/challenges/config")
def update_admin_challenge_config(
    payload: ChallengeConfigUpdateRequest,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, object]]]:
    _validate_and_consume_admin_otp(db, current_admin.id, payload.otp)

    row = _get_or_seed_config(db)
    row.config_value = [plan.model_dump() for plan in payload.plans]
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"plans": row.config_value}


@router.put("/admin/hero/stats")
def update_admin_hero_stats(
    payload: HeroStatsUpdateRequest,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, dict[str, str]]:
    _validate_and_consume_admin_otp(db, current_admin.id, payload.otp)

    row = _get_or_seed_hero_stats_config(db)
    row.config_value = payload.stats.model_dump()
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"stats": _normalize_hero_stats(row.config_value)}

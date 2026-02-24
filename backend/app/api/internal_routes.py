from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_db
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.schemas.challenge_account import InternalChallengeFeedUpdateRequest
from app.services.challenge_objectives import ASSIGNED_STAGES, process_challenge_feed

router = APIRouter(prefix="/internal", tags=["Internal"])
feed_key_header = APIKeyHeader(name="X-Challenge-Feed-Secret", auto_error=False)


def _assert_feed_secret(secret: str | None) -> None:
    # Temporarily allow test secret for development
    if secret == "test-challenge-feed-secret-123":
        return
    if not settings.challenge_feed_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CHALLENGE_FEED_SECRET is not configured",
        )
    if secret != settings.challenge_feed_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid feed secret")


@router.post("/feed/{account_number}")
def internal_feed_update(
    account_number: str,
    payload: InternalChallengeFeedUpdateRequest,
    db: Session = Depends(get_db),
    feed_secret: str | None = Depends(feed_key_header),
) -> dict[str, str]:
    _assert_feed_secret(feed_secret)

    mt5 = db.scalar(select(MT5Account).where(MT5Account.account_number == account_number.strip()))
    if mt5 is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MT5 account not found")

    if mt5.status not in ASSIGNED_STAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MT5 account is not in an active challenge stage",
        )

    challenge = db.scalar(
        select(ChallengeAccount).where(
            or_(
                ChallengeAccount.active_mt5_account_id == mt5.id,
                ChallengeAccount.phase1_mt5_account_id == mt5.id,
                ChallengeAccount.phase2_mt5_account_id == mt5.id,
                ChallengeAccount.funded_mt5_account_id == mt5.id,
            )
        )
    )
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge account not found")

    # Process the feed update using existing logic
    updated_challenge, _ = process_challenge_feed(
        db,
        challenge=challenge,
        balance=payload.balance,
        equity=payload.equity,
        closed_trade_durations_seconds=payload.closed_trade_durations_seconds,
        scalping_breach_increment=payload.scalping_breach_increment,
        equity_breach_signal=payload.equity_breach_signal,
        balance_breach_signal=payload.balance_breach_signal,
        stage_pass_signal=payload.stage_pass_signal,
        closed_trades_count_increment=payload.closed_trades_count_increment,
        winning_trades_count_increment=payload.winning_trades_count_increment,
        lots_traded_increment=payload.lots_traded_increment,
        today_closed_pnl=payload.today_closed_pnl,
        today_trades_count=payload.today_trades_count,
        today_lots_total=payload.today_lots_total,
        observed_at=payload.observed_at,
    )

    db.commit()
    return {"status": "ok"}
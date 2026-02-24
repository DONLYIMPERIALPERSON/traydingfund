from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_db
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.models.mt5_refresh_job import MT5RefreshJob, RefreshReason, RefreshStatus
from app.schemas.challenge_account import (
    EngineActiveAccount,
    InternalChallengeFeedUpdateRequest,
    RefreshJobClaim,
    RefreshJobCompleteRequest,
)
from app.services.challenge_objectives import ASSIGNED_STAGES, process_challenge_feed

router = APIRouter(prefix="/internal", tags=["Internal"])
feed_key_header = APIKeyHeader(name="X-Challenge-Feed-Secret", auto_error=False)
engine_id_header = APIKeyHeader(name="X-Engine-Id", auto_error=False)


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

    # Update last_feed_at timestamp
    from datetime import datetime
    updated_challenge.last_feed_at = datetime.now(datetime.timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.get("/engine/active-accounts")
def get_active_accounts(
    limit: int = 50,
    db: Session = Depends(get_db),
    feed_secret: str | None = Depends(feed_key_header),
    engine_id: str | None = Depends(engine_id_header),
) -> list[EngineActiveAccount]:
    _assert_feed_secret(feed_secret)

    # Get active accounts that are in active stages
    query = (
        select(
            ChallengeAccount.challenge_id,
            MT5Account.account_number,
            MT5Account.server,
            MT5Account.investor_password.label("password"),
            ChallengeAccount.last_feed_at,
        )
        .join(MT5Account, ChallengeAccount.active_mt5_account_id == MT5Account.id)
        .where(
            ChallengeAccount.objective_status == "active",
            ChallengeAccount.current_stage.in_(["Phase 1", "Phase 2", "Funded"]),
            MT5Account.status.in_(ASSIGNED_STAGES),
        )
        .order_by(ChallengeAccount.last_feed_at.asc().nullsfirst())  # Prioritize stale accounts
        .limit(limit)
    )

    results = db.execute(query).fetchall()
    return [EngineActiveAccount.model_validate(row._asdict()) for row in results]


@router.get("/engine/refresh-jobs")
def get_refresh_jobs(
    limit: int = 20,
    db: Session = Depends(get_db),
    feed_secret: str | None = Depends(feed_key_header),
    engine_id: str | None = Depends(engine_id_header),
) -> list[RefreshJobClaim]:
    _assert_feed_secret(feed_secret)

    if not engine_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Engine-Id header required",
        )

    # Atomically claim queued jobs
    jobs_query = (
        select(MT5RefreshJob.id, MT5Account.account_number, MT5Account.server, MT5Account.investor_password)
        .join(MT5Account, MT5RefreshJob.account_number == MT5Account.account_number)
        .where(MT5RefreshJob.status == RefreshStatus.queued)
        .order_by(MT5RefreshJob.requested_at.asc())
        .limit(limit)
        .with_for_update(skip_locked=True)
    )

    jobs = db.execute(jobs_query).fetchall()

    # Update claimed jobs to processing
    if jobs:
        job_ids = [job.id for job in jobs]
        db.execute(
            update(MT5RefreshJob)
            .where(MT5RefreshJob.id.in_(job_ids))
            .values(
                status=RefreshStatus.processing,
                engine_id=engine_id,
                started_at=datetime.now(datetime.timezone.utc),
            )
        )
        db.commit()

    return [RefreshJobClaim.model_validate(job._asdict()) for job in jobs]


@router.post("/engine/refresh-jobs/{job_id}/complete")
def complete_refresh_job(
    job_id: int,
    payload: RefreshJobCompleteRequest,
    db: Session = Depends(get_db),
    feed_secret: str | None = Depends(feed_key_header),
    engine_id: str | None = Depends(engine_id_header),
) -> dict[str, str]:
    _assert_feed_secret(feed_secret)

    job = db.scalar(select(MT5RefreshJob).where(MT5RefreshJob.id == job_id))
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.engine_id != engine_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Job not claimed by this engine",
        )

    job.status = payload.status
    job.finished_at = datetime.now(datetime.timezone.utc)
    if payload.error:
        job.error = payload.error

    db.commit()
    return {"status": "ok"}

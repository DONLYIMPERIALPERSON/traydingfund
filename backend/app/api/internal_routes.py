from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy import and_, or_, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_db
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.models.mt5_refresh_job import MT5RefreshJob, RefreshReason, RefreshStatus
from app.schemas.challenge_account import (
    EngineActiveAccount,
    EngineActiveAccountClaim,
    InternalChallengeFeedUpdateRequest,
    RefreshJobClaim,
    RefreshJobCompleteRequest,
)
from app.services.challenge_objectives import ASSIGNED_STAGES, process_challenge_feed
from app.tasks import process_mt5_feed

router = APIRouter(prefix="/internal", tags=["Internal"])
feed_key_header = APIKeyHeader(name="X-Challenge-Feed-Secret", auto_error=False)
engine_id_header = APIKeyHeader(name="X-Engine-Id", auto_error=False)
logger = logging.getLogger(__name__)


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
    engine_id: str | None = Depends(engine_id_header),
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

    if account_number.strip() == "298668033":
        logger.info(
            "scalping-debug account=%s scalping_breach_increment=%s durations=%s",
            account_number,
            payload.scalping_breach_increment,
            payload.closed_trade_durations_seconds,
        )

    # Dispatch feed processing to the task so breach/pass emails are triggered consistently
    process_mt5_feed.delay(
        challenge_id=challenge.challenge_id,
        balance=payload.balance,
        equity=payload.equity if payload.equity is not None else payload.balance,
        closed_trade_durations_seconds=payload.closed_trade_durations_seconds,
        scalping_breach_increment=payload.scalping_breach_increment,
        equity_breach_signal=payload.equity_breach_signal or False,
        balance_breach_signal=payload.balance_breach_signal or False,
        stage_pass_signal=payload.stage_pass_signal,
        closed_trades_count_increment=payload.closed_trades_count_increment or 0,
        winning_trades_count_increment=payload.winning_trades_count_increment or 0,
        lots_traded_increment=payload.lots_traded_increment or 0,
        today_closed_pnl=payload.today_closed_pnl or 0,
        today_trades_count=payload.today_trades_count or 0,
        today_lots_total=payload.today_lots_total or 0,
        observed_at=payload.observed_at or datetime.now(timezone.utc),
    )

    # Update last_feed_at timestamp without waiting for the task
    challenge.last_feed_at = datetime.now(timezone.utc)
    if engine_id:
        challenge.last_feed_engine_id = engine_id
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


@router.post("/engine/active-accounts/claim")
def claim_active_accounts(
    limit: int = 50,
    lease_seconds: int = 45,
    min_feed_age_seconds: int = 0,
    db: Session = Depends(get_db),
    feed_secret: str | None = Depends(feed_key_header),
    engine_id: str | None = Depends(engine_id_header),
) -> list[EngineActiveAccountClaim]:
    _assert_feed_secret(feed_secret)

    if not engine_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Engine-Id header required",
        )

    now = datetime.now(timezone.utc)
    lease_until = now + timedelta(seconds=lease_seconds)
    min_feed_cutoff = now - timedelta(seconds=min_feed_age_seconds) if min_feed_age_seconds > 0 else None

    claim_query = (
        select(
            ChallengeAccount.id,
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
            or_(
                ChallengeAccount.monitor_lease_until.is_(None),
                ChallengeAccount.monitor_lease_until < now,
            ),
            (
                ChallengeAccount.last_feed_at.is_(None)
                if min_feed_cutoff is None
                else or_(
                    ChallengeAccount.last_feed_at.is_(None),
                    ChallengeAccount.last_feed_at < min_feed_cutoff,
                )
            ),
        )
        .order_by(ChallengeAccount.last_feed_at.asc().nullsfirst())
        .limit(limit)
        .with_for_update(skip_locked=True)
    )

    claimed_rows = db.execute(claim_query).fetchall()
    if not claimed_rows:
        logger.info(
            "monitor-claim: no rows (engine_id=%s limit=%s lease_seconds=%s min_feed_age_seconds=%s)",
            engine_id,
            limit,
            lease_seconds,
            min_feed_age_seconds,
        )
        return []

    claimed_ids = [row.id for row in claimed_rows]
    db.execute(
        update(ChallengeAccount)
        .where(ChallengeAccount.id.in_(claimed_ids))
        .values(
            monitor_lease_owner=engine_id,
            monitor_lease_until=lease_until,
        )
    )
    db.commit()

    logger.info(
        "monitor-claim: claimed %s rows (engine_id=%s lease_until=%s min_feed_age_seconds=%s)",
        len(claimed_rows),
        engine_id,
        lease_until.isoformat(),
        min_feed_age_seconds,
    )

    response = []
    for row in claimed_rows:
        response.append(
            EngineActiveAccountClaim(
                challenge_id=row.challenge_id,
                account_number=row.account_number,
                server=row.server,
                password=row.password,
                last_feed_at=row.last_feed_at,
                lease_owner=engine_id,
                lease_until=lease_until,
            )
        )

    return response


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

    # Atomically claim queued jobs and orphaned processing jobs
    # Orphaned processing jobs: started > 10 minutes ago or no engine_id
    ten_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
    jobs_query = (
        select(MT5RefreshJob.id, MT5Account.account_number, MT5Account.server, MT5Account.investor_password.label("password"))
        .join(MT5Account, MT5RefreshJob.account_number == MT5Account.account_number)
        .where(
            or_(
                MT5RefreshJob.status == RefreshStatus.queued,
                and_(
                    MT5RefreshJob.status == RefreshStatus.processing,
                    or_(
                        MT5RefreshJob.engine_id.is_(None),
                        MT5RefreshJob.started_at < ten_minutes_ago
                    )
                )
            )
        )
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
                started_at=datetime.now(timezone.utc),
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
    job.finished_at = datetime.now(timezone.utc)
    if payload.error:
        job.error = payload.error

    db.commit()
    return {"status": "ok"}

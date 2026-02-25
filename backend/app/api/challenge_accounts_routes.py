from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.core.config import settings
from app.db.deps import get_db
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.models.user import User
from app.schemas.challenge_account import (
    ChallengeFeedUpdateRequest,
    ChallengeFeedUpdateResponse,
    FundedWithdrawalApproveRequest,
    FundedWithdrawalApproveResponse,
)
from app.services.challenge_objectives import (
    ASSIGNED_STAGES,
    compute_max_permitted_loss_left,
    compute_unrealized_pnl,
    compute_win_rate,
    is_min_trading_days_met,
    process_challenge_feed,
    rollover_funded_account_after_withdrawal,
)
from app.tasks import send_challenge_breach_email, send_challenge_pass_email, send_challenge_objective_email, process_mt5_feed
from celery.result import AsyncResult


router = APIRouter(prefix="/admin/challenge-accounts", tags=["Challenge Accounts"])
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


def _try_send_challenge_mail(*, user: User | None, subject: str, message: str) -> None:
    if user is None:
        return
    try:
        if "passed" in subject.lower() or "passed" in message.lower():
            send_challenge_pass_email.delay(to_email=user.email, message=message)
        elif "breached" in subject.lower() or "breach" in message.lower():
            send_challenge_breach_email.delay(to_email=user.email, message=message)
        else:
            # For other notifications, use basic template
            send_challenge_objective_email.delay(to_email=user.email, subject=subject, message=message)
    except Exception:
        # Do not fail objective processing because email service is unavailable.
        return


def _to_row(
    challenge: ChallengeAccount,
    mt5_by_id: dict[int, MT5Account],
    user_by_id: dict[int, User],
) -> dict[str, str | int | None]:
    active = mt5_by_id.get(challenge.active_mt5_account_id or -1)
    user = user_by_id.get(challenge.user_id)
    return {
        "challenge_id": challenge.challenge_id,
        "user_id": challenge.user_id,
        "trader_name": (user.nick_name or user.email) if user else None,
        "account_size": challenge.account_size,
        "phase": challenge.current_stage,
        "mt5_account": active.account_number if active else None,
        "mt5_server": active.server if active else None,
        "mt5_password": active.password if active else None,
        "objective_status": challenge.objective_status,
        "breached_reason": challenge.breached_reason,
        "breached_at": challenge.breached_at.isoformat() if challenge.breached_at else None,
        "passed_at": challenge.passed_at.isoformat() if challenge.passed_at else None,
        "current_pnl": f"+₦{(challenge.latest_equity - challenge.initial_balance):,.0f}" if challenge.latest_equity > challenge.initial_balance else f"₦{(challenge.latest_equity - challenge.initial_balance):,.0f}",
    }


def _to_breach_row(
    challenge: ChallengeAccount,
    mt5_by_id: dict[int, MT5Account],
    user_by_id: dict[int, User],
) -> dict[str, str | int | None]:
    active = mt5_by_id.get(challenge.active_mt5_account_id or -1)
    user = user_by_id.get(challenge.user_id)
    return {
        "challenge_id": challenge.challenge_id,
        "user_id": challenge.user_id,
        "trader_name": (user.nick_name or user.email) if user else None,
        "account_size": challenge.account_size,
        "phase": challenge.current_stage,
        "mt5_account": active.account_number if active else None,
        "breach_reason": challenge.breached_reason,
        "breached_at": challenge.breached_at.isoformat() if challenge.breached_at else None,
    }


@router.get("")
def list_challenge_accounts(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | int | None]]]:
    rows = db.scalars(select(ChallengeAccount).order_by(ChallengeAccount.id.desc())).all()
    active_ids = [row.active_mt5_account_id for row in rows if row.active_mt5_account_id is not None]
    user_ids = sorted({row.user_id for row in rows})
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(active_ids))).all() if active_ids else []
    user_rows = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}
    user_by_id = {row.id: row for row in user_rows}

    return {"accounts": [_to_row(row, mt5_by_id, user_by_id) for row in rows]}


@router.get("/active")
def list_active_challenge_accounts(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | int | None]]]:
    rows = db.scalars(
        select(ChallengeAccount)
        .where(ChallengeAccount.objective_status == "active")
        .where(ChallengeAccount.current_stage != "Funded")
        .order_by(ChallengeAccount.id.desc())
    ).all()
    active_ids = [row.active_mt5_account_id for row in rows if row.active_mt5_account_id is not None]
    user_ids = sorted({row.user_id for row in rows})
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(active_ids))).all() if active_ids else []
    user_rows = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}
    user_by_id = {row.id: row for row in user_rows}

    return {"accounts": [_to_row(row, mt5_by_id, user_by_id) for row in rows]}


@router.get("/breaches")
def list_breached_accounts(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | int | None]]]:
    rows = db.scalars(
        select(ChallengeAccount)
        .where(ChallengeAccount.objective_status == "breached")
        .order_by(ChallengeAccount.breached_at.desc().nullslast(), ChallengeAccount.id.desc())
    ).all()
    active_ids = [row.active_mt5_account_id for row in rows if row.active_mt5_account_id is not None]
    user_ids = sorted({row.user_id for row in rows})
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(active_ids))).all() if active_ids else []
    user_rows = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}
    user_by_id = {row.id: row for row in user_rows}

    return {"accounts": [_to_breach_row(row, mt5_by_id, user_by_id) for row in rows]}


@router.post("/feed/update")
def ingest_challenge_feed_update(
    payload: ChallengeFeedUpdateRequest,
    db: Session = Depends(get_db),
    feed_secret: str | None = Depends(feed_key_header),
) -> dict[str, str]:
    _assert_feed_secret(feed_secret)

    account_number = payload.account_number.strip()
    mt5 = db.scalar(select(MT5Account).where(MT5Account.account_number == account_number))
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

    # Queue the processing as a Celery task
    task = process_mt5_feed.delay(
        challenge.challenge_id,
        payload.balance,
        payload.equity,
        payload.closed_trade_durations_seconds,
        payload.scalping_breach_increment,
        payload.equity_breach_signal,
        payload.balance_breach_signal,
        payload.stage_pass_signal,
        payload.closed_trades_count_increment,
        payload.winning_trades_count_increment,
        payload.lots_traded_increment,
        payload.today_closed_pnl,
        payload.today_trades_count,
        payload.today_lots_total,
        payload.observed_at
    )

    return {"task_id": task.id, "status": "queued"}
    _assert_feed_secret(feed_secret)

    account_number = payload.account_number.strip()
    mt5 = db.scalar(select(MT5Account).where(MT5Account.account_number == account_number))
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

    # Queue the processing as a Celery task
    task = process_mt5_feed.delay(
        challenge.challenge_id,
        payload.balance,
        payload.equity,
        payload.closed_trade_durations_seconds,
        payload.scalping_breach_increment,
        payload.equity_breach_signal,
        payload.balance_breach_signal,
        payload.stage_pass_signal,
        payload.closed_trades_count_increment,
        payload.winning_trades_count_increment,
        payload.lots_traded_increment,
        payload.today_closed_pnl,
        payload.today_trades_count,
        payload.today_lots_total,
        payload.observed_at
    )

    # Return immediately with task ID
    return ChallengeFeedUpdateResponse(
        task_id=task.id,
        status="queued"
    )
    _assert_feed_secret(feed_secret)

    account_number = payload.account_number.strip()
    mt5 = db.scalar(select(MT5Account).where(MT5Account.account_number == account_number))
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

    user = db.get(User, challenge.user_id)
    prev_status = challenge.objective_status
    prev_payout_amount = challenge.funded_user_payout_amount

    updated_challenge, transitioned_to_stage = process_challenge_feed(
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
    db.refresh(updated_challenge)

    if updated_challenge.objective_status == "breached" and prev_status != "breached":
        breach_reason_lookup = {
            "drawdown_limit": "drawdown",
            "scalping_rule": "scalping rule",
            "equity_signal": "equity breach signal",
            "balance_signal": "balance breach signal",
        }
        breach_reason = breach_reason_lookup.get(updated_challenge.breached_reason or "", "risk rule")
        _try_send_challenge_mail(
            user=user,
            subject="Challenge Stage Breached",
            message=(
                f"Your challenge {updated_challenge.challenge_id} was breached at {updated_challenge.current_stage} "
                f"due to {breach_reason}."
            ),
        )

    if transitioned_to_stage is not None:
        active_mt5 = db.get(MT5Account, updated_challenge.active_mt5_account_id) if updated_challenge.active_mt5_account_id else None
        if active_mt5:
            message = (
                f"Congratulations! You passed {updated_challenge.passed_stage or 'your stage'} and have been moved "
                f"to {transitioned_to_stage}.\n\n"
                f"Your new MT5 trading account details:\n"
                f"• Account Number: {active_mt5.account_number}\n"
                f"• Server: {active_mt5.server}\n"
                f"• Password: {active_mt5.password}\n\n"
                f"You can now log in to your MT5 platform and continue trading."
            )
        else:
            message = (
                f"Congratulations! You passed {updated_challenge.passed_stage or 'your stage'} and have been moved "
                f"to {transitioned_to_stage}."
            )
        _try_send_challenge_mail(
            user=user,
            subject="Challenge Stage Passed",
            message=message,
        )

        # Generate certificate for Funded stage progression
        if transitioned_to_stage == "Funded":
            try:
                from app.services.certificate_service import get_certificate_service
                certificate_service = get_certificate_service()
                certificate_service.generate_funding_certificate(
                    user_id=user.id,
                    challenge_account_id=updated_challenge.challenge_id,
                    account_size=updated_challenge.account_size,
                    db=db
                )
            except Exception as e:
                # Log certificate generation failure but don't fail the progression
                print(f"Certificate generation failed for user {user.email}: {e}")
                pass

    if updated_challenge.objective_status == "awaiting_next_stage_account":
        _try_send_challenge_mail(
            user=user,
            subject="Challenge Progress Pending",
            message=(
                f"You passed {updated_challenge.passed_stage or 'the current stage'}, but the next stage account is "
                "not yet available. Our team will assign it shortly."
            ),
        )

    if (
        updated_challenge.current_stage == "Funded"
        and updated_challenge.objective_status == "active"
        and updated_challenge.funded_user_payout_amount > prev_payout_amount
    ):
        _try_send_challenge_mail(
            user=user,
            subject="Funded Account Profit Update",
            message=(
                f"Your funded account eligible payout is now ₦{updated_challenge.funded_user_payout_amount:,.2f} "
                f"(capped profit: ₦{updated_challenge.funded_profit_capped:,.2f})."
            ),
        )

    min_trading_days_required, stage_elapsed_hours, min_trading_days_met = is_min_trading_days_met(
        db,
        updated_challenge,
        now=payload.observed_at,
    )

    return ChallengeFeedUpdateResponse(
        challenge_id=updated_challenge.challenge_id,
        stage=updated_challenge.current_stage,
        objective_status=updated_challenge.objective_status,
        breached_reason=updated_challenge.breached_reason,
        passed_stage=updated_challenge.passed_stage,
        highest_balance=updated_challenge.highest_balance,
        breach_balance=updated_challenge.breach_balance,
        profit_target_balance=updated_challenge.profit_target_balance,
        scalping_violations_count=updated_challenge.scalping_violations_count,
        funded_profit_raw=updated_challenge.funded_profit_raw,
        funded_profit_capped=updated_challenge.funded_profit_capped,
        funded_profit_cap_amount=updated_challenge.funded_profit_cap_amount,
        funded_user_payout_amount=updated_challenge.funded_user_payout_amount,
        unrealized_pnl=compute_unrealized_pnl(updated_challenge),
        max_permitted_loss_left=compute_max_permitted_loss_left(updated_challenge),
        win_rate=compute_win_rate(updated_challenge),
        min_trading_days_required=min_trading_days_required,
        min_trading_days_met=min_trading_days_met,
        stage_elapsed_hours=round(stage_elapsed_hours, 2),
        closed_trades_count=updated_challenge.closed_trades_count,
        winning_trades_count=updated_challenge.winning_trades_count,
        lots_traded_total=round(updated_challenge.lots_traded_total, 2),
        today_closed_pnl=round(updated_challenge.today_closed_pnl, 2),
        today_trades_count=updated_challenge.today_trades_count,
        today_lots_total=round(updated_challenge.today_lots_total, 2),
        transitioned_to_stage=transitioned_to_stage,
    )


@router.post(
    "/{challenge_id}/funded/approve-withdrawal",
    response_model=FundedWithdrawalApproveResponse,
)
def approve_funded_withdrawal(
    challenge_id: str,
    payload: FundedWithdrawalApproveRequest,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> FundedWithdrawalApproveResponse:
    if not payload.approved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Withdrawal approval flag must be true")

    challenge = db.scalar(select(ChallengeAccount).where(ChallengeAccount.challenge_id == challenge_id.strip()))
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge account not found")

    old_account, new_account = rollover_funded_account_after_withdrawal(db, challenge=challenge)
    db.commit()
    db.refresh(challenge)

    user = db.get(User, challenge.user_id)
    _try_send_challenge_mail(
        user=user,
        subject="Withdrawal Approved: New Funded Account Assigned",
        message=(
            f"Your funded withdrawal was approved. Old funded account {old_account.account_number} is now marked "
            f"as withdrawn, and your new funded account is {new_account.account_number}."
        ),
    )

    return FundedWithdrawalApproveResponse(
        challenge_id=challenge.challenge_id,
        old_funded_account_number=old_account.account_number,
        new_funded_account_number=new_account.account_number,
        withdrawal_count=challenge.withdrawal_count,
    )


@router.get("/funded")
def list_funded_accounts(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | int | None]]]:
    rows = db.scalars(
        select(ChallengeAccount)
        .where(
            ChallengeAccount.current_stage == "Funded",
            ChallengeAccount.objective_status != "breached"
        )
        .order_by(ChallengeAccount.id.desc())
    ).all()
    active_ids = [row.active_mt5_account_id for row in rows if row.active_mt5_account_id is not None]
    user_ids = sorted({row.user_id for row in rows})
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(active_ids))).all() if active_ids else []
    user_rows = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}
    user_by_id = {row.id: row for row in user_rows}

    return {"accounts": [_to_row(row, mt5_by_id, user_by_id) for row in rows]}


@router.get("/funded/profitable")
def list_profitable_funded_accounts(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | int | None]]]:
    rows = db.scalars(
        select(ChallengeAccount)
        .where(
            ChallengeAccount.current_stage == "Funded",
            ChallengeAccount.objective_status != "breached"
        )
        .order_by(ChallengeAccount.funded_profit_capped.desc())
        .limit(10)
    ).all()
    active_ids = [row.active_mt5_account_id for row in rows if row.active_mt5_account_id is not None]
    user_ids = sorted({row.user_id for row in rows})
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(active_ids))).all() if active_ids else []
    user_rows = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}
    user_by_id = {row.id: row for row in user_rows}

    result = []
    for i, row in enumerate(rows, 1):
        base_row = _to_row(row, mt5_by_id, user_by_id)
        base_row["rank"] = i
        base_row["profit"] = f"+₦{row.funded_profit_capped:,.2f}" if row.funded_profit_capped and row.funded_profit_capped > 0 else "₦0"
        base_row["win_rate"] = f"{compute_win_rate(row):.1f}%"
        result.append(base_row)

    return {"accounts": result}


@router.delete("/{challenge_id}")
def delete_challenge_account(
    challenge_id: str,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    challenge = db.scalar(select(ChallengeAccount).where(ChallengeAccount.challenge_id == challenge_id.strip()))
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge account not found")

    # Update associated MT5 accounts to Ready status if they were assigned to this challenge
    mt5_ids_to_reset = []
    if challenge.phase1_mt5_account_id:
        mt5_ids_to_reset.append(challenge.phase1_mt5_account_id)
    if challenge.phase2_mt5_account_id:
        mt5_ids_to_reset.append(challenge.phase2_mt5_account_id)
    if challenge.funded_mt5_account_id:
        mt5_ids_to_reset.append(challenge.funded_mt5_account_id)
    if challenge.active_mt5_account_id and challenge.active_mt5_account_id not in mt5_ids_to_reset:
        mt5_ids_to_reset.append(challenge.active_mt5_account_id)

    if mt5_ids_to_reset:
        db.execute(
            select(MT5Account)
            .where(MT5Account.id.in_(mt5_ids_to_reset))
            .where(MT5Account.status.in_(ASSIGNED_STAGES))
        ).update({"status": "Ready", "assigned_user_id": None, "assignment_mode": None, "assigned_by_admin_name": None, "assigned_at": None})

    # Delete the challenge account
    db.delete(challenge)
    db.commit()

    return {"message": f"Challenge {challenge_id} deleted successfully"}


@router.get("/feed/task/{task_id}", response_model=ChallengeFeedUpdateResponse)
def get_feed_task_result(task_id: str) -> ChallengeFeedUpdateResponse:
    result = AsyncResult(task_id)
    if result.ready():
        if result.successful():
            return result.result
        else:
            raise HTTPException(status_code=500, detail="Task failed")
    else:
        raise HTTPException(status_code=202, detail="Task pending")

@router.get("/awaiting-next-stage")
def list_awaiting_next_stage_accounts(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | int | None]]]:
    rows = db.scalars(
        select(ChallengeAccount)
        .where(ChallengeAccount.objective_status == "awaiting_next_stage_account")
        .order_by(ChallengeAccount.id.desc())
    ).all()
    active_ids = [row.active_mt5_account_id for row in rows if row.active_mt5_account_id is not None]
    user_ids = sorted({row.user_id for row in rows})
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(active_ids))).all() if active_ids else []
    user_rows = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}
    user_by_id = {row.id: row for row in user_rows}

    return {"accounts": [_to_row(row, mt5_by_id, user_by_id) for row in rows]}

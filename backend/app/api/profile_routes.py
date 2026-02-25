from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth_routes import serialize_user
from app.core.auth import get_current_user
from app.db.deps import get_db
from app.models.bank_directory import BankDirectory
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.models.mt5_refresh_job import MT5RefreshJob, RefreshReason
from app.models.user import User
from app.models.user_bank_account import UserBankAccount
from app.schemas.profile import (
    BankAccountResponse,
    KycEligibilityResponse,
    BankListItem,
    BankListResponse,
    KycSubmissionResponse,
    ProfileUpdateRequest,
    ResolveAccountNameResponse,
    SubmitKycRequest,
    UserChallengeAccountDetailResponse,
    UserChallengeAccountListItem,
    UserChallengeAccountListResponse,
    UserChallengeCredentials,
    UserChallengeMetrics,
    UserChallengeObjectiveStatus,
    VerifyBankAccountRequest,
    WithdrawalPrecheckResponse,
)
from app.schemas.challenge_account import ChallengeRefreshRequest, ChallengeRefreshResponse
from app.services.challenge_objectives import (
    ASSIGNED_STAGES,
    compute_max_permitted_loss_left,
    compute_unrealized_pnl,
    compute_win_rate,
    is_min_trading_days_met,
)
from app.tasks import send_kyc_approved_email
from app.data.banks import NIGERIAN_BANKS
from app.services.palmpay_service import PalmPayQueryError, query_bank_account_name


router = APIRouter(prefix="/profile", tags=["Profile"])

KYC_COMPLETED_STATUSES = {"verified", "approved", "completed"}


def _to_bank_account_response(row: UserBankAccount) -> BankAccountResponse:
    return BankAccountResponse(
        user_id=row.user_id,
        bank_code=row.bank_code,
        bank_account_number=row.bank_account_number,
        account_name=row.account_name,
        is_verified=row.is_verified,
        verified_at=row.verified_at.isoformat() if row.verified_at else None,
    )


def _display_status_for(challenge: ChallengeAccount, mt5: MT5Account | None) -> str:
    if challenge.objective_status == "breached":
        return "Failed"
    if challenge.objective_status == "awaiting_next_stage_account":
        return "Passed"
    if challenge.objective_status == "passed":
        return "Passed"
    if mt5 is None:
        return "Ready"
    if mt5.status in ASSIGNED_STAGES and challenge.objective_status == "active":
        return "Active"
    if mt5.status == "Withdrawn":
        return "Withdrawn"
    return "Ready"


def _is_active_for_user_view(challenge: ChallengeAccount, mt5: MT5Account | None) -> bool:
    return bool(
        mt5
        and challenge.objective_status == "active"
        and mt5.status in ASSIGNED_STAGES
    )


def _challenge_list_item(challenge: ChallengeAccount, mt5: MT5Account | None) -> UserChallengeAccountListItem:
    return UserChallengeAccountListItem(
        challenge_id=challenge.challenge_id,
        account_size=challenge.account_size,
        phase=challenge.current_stage,
        objective_status=challenge.objective_status,
        display_status=_display_status_for(challenge, mt5),
        is_active=_is_active_for_user_view(challenge, mt5),
        mt5_account=mt5.account_number if mt5 else None,
        started_at=challenge.stage_started_at.isoformat() if challenge.stage_started_at else challenge.created_at.isoformat(),
        breached_at=challenge.breached_at.isoformat() if challenge.breached_at else None,
        passed_at=challenge.passed_at.isoformat() if challenge.passed_at else None,
        passed_stage=challenge.passed_stage,
    )


def _resolve_current_mt5(challenge: ChallengeAccount, mt5_by_id: dict[int, MT5Account]) -> MT5Account | None:
    candidate_ids = [
        challenge.active_mt5_account_id,
        challenge.funded_mt5_account_id,
        challenge.phase2_mt5_account_id,
        challenge.phase1_mt5_account_id,
    ]
    for cid in candidate_ids:
        if cid is not None and cid in mt5_by_id:
            return mt5_by_id[cid]
    return None


def _user_has_funded_account(db: Session, user_id: int) -> bool:
    return (
        db.scalar(
            select(ChallengeAccount.id)
            .where(ChallengeAccount.user_id == user_id)
            .where(
                (ChallengeAccount.current_stage == "Funded")
                | (ChallengeAccount.funded_mt5_account_id.is_not(None))
            )
        )
        is not None
    )


def _kyc_eligibility_message(has_funded_account: bool) -> str:
    if has_funded_account:
        return "Eligible for KYC."
    return "You are not eligible for KYC yet. You must have at least one funded account first."





@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)) -> dict[str, str | int | None]:
    return serialize_user(current_user)


@router.patch("/me")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | int | None]:
    changed = False

    if payload.full_name is not None:
        full_name = payload.full_name.strip()
        if current_user.full_name != full_name:
            current_user.full_name = full_name
            changed = True

    if payload.nick_name is not None:
        nick_name = payload.nick_name.strip()
        if current_user.nick_name != nick_name:
            current_user.nick_name = nick_name
            changed = True

    if changed:
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    return serialize_user(current_user)


@router.patch("/settings/certificate-name")
def update_certificate_name_setting(
    use_nickname: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    if current_user.use_nickname_for_certificates != use_nickname:
        current_user.use_nickname_for_certificates = use_nickname
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    return {"use_nickname_for_certificates": current_user.use_nickname_for_certificates}


@router.get("/bank-account", response_model=BankAccountResponse | None)
def get_bank_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BankAccountResponse | None:
    row = db.scalar(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id))
    if row is None:
        return None
    return _to_bank_account_response(row)


@router.get("/banks", response_model=BankListResponse)
def get_bank_list(
    refresh: bool = False,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BankListResponse:
    # Return hardcoded bank data directly - no PalmPay API calls needed
    return BankListResponse(
        banks=[
            BankListItem(
                bank_code=bank["bank_code"],
                bank_name=bank["bank_name"],
                bank_url=bank.get("bank_url"),
            )
            for bank in NIGERIAN_BANKS
        ]
    )


@router.post("/kyc/resolve-account-name", response_model=ResolveAccountNameResponse)
def resolve_account_name(
    payload: VerifyBankAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResolveAccountNameResponse:
    if not _user_has_funded_account(db, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC is only available after you have at least one funded account.",
        )

    bank_code = payload.bank_code.strip()
    bank_account_number = payload.bank_account_number.strip()

    # Check if bank exists in hardcoded list instead of database
    bank = next((b for b in NIGERIAN_BANKS if b["bank_code"] == bank_code), None)
    if bank is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected bank is unavailable")

    try:
        account_name = query_bank_account_name(bank_code=bank_code, bank_account_number=bank_account_number)
    except PalmPayQueryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return ResolveAccountNameResponse(
        bank_code=bank_code,
        bank_account_number=bank_account_number,
        account_name=account_name,
    )


@router.post("/kyc/submit", response_model=KycSubmissionResponse)
def submit_kyc(
    payload: SubmitKycRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KycSubmissionResponse:
    if not _user_has_funded_account(db, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC is only available after you have at least one funded account.",
        )

    bank_code = payload.bank_code.strip()
    bank_account_number = payload.bank_account_number.strip()

    # Check if bank exists in hardcoded list instead of database
    bank = next((b for b in NIGERIAN_BANKS if b["bank_code"] == bank_code), None)
    if bank is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected bank is unavailable")

    try:
        account_name = query_bank_account_name(bank_code=bank_code, bank_account_number=bank_account_number)
    except PalmPayQueryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    now = datetime.now(timezone.utc)
    row = db.scalar(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id))
    if row is None:
        row = UserBankAccount(
            user_id=current_user.id,
            bank_code=bank_code,
            bank_account_number=bank_account_number,
            account_name=account_name,
            is_verified=True,
            verified_at=now,
        )
    else:
        row.bank_code = bank_code
        row.bank_account_number = bank_account_number
        row.account_name = account_name
        row.is_verified = True
        row.verified_at = now

    # Update user's full name with the verified bank account name
    current_user.full_name = account_name
    current_user.kyc_status = "approved"

    db.add(row)
    db.add(current_user)
    db.commit()
    db.refresh(row)
    db.refresh(current_user)

    try:
        send_kyc_approved_email.delay(
            to_email=current_user.email,
            account_name=row.account_name,
            bank_name=bank["bank_name"],
            bank_account_number=row.bank_account_number,
        )
    except Exception:
        pass

    return KycSubmissionResponse(
        status="approved",
        message="KYC submitted and auto-approved successfully.",
        kyc_status=current_user.kyc_status,
        bank_account=_to_bank_account_response(row),
    )


@router.get("/kyc/eligibility", response_model=KycEligibilityResponse)
def get_kyc_eligibility(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KycEligibilityResponse:
    has_funded_account = _user_has_funded_account(db, current_user.id)
    return KycEligibilityResponse(
        eligible=has_funded_account,
        message=_kyc_eligibility_message(has_funded_account),
    )


@router.post("/bank-account/verify", response_model=BankAccountResponse)
def verify_and_save_bank_account(
    payload: VerifyBankAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BankAccountResponse:
    bank_code = payload.bank_code.strip()
    bank_account_number = payload.bank_account_number.strip()

    if not bank_code or not bank_account_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bank_code and bank_account_number are required")

    try:
        account_name = query_bank_account_name(bank_code=bank_code, bank_account_number=bank_account_number)
    except PalmPayQueryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    row = db.scalar(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id))
    now = datetime.now(timezone.utc)

    if row is None:
        row = UserBankAccount(
            user_id=current_user.id,
            bank_code=bank_code,
            bank_account_number=bank_account_number,
            account_name=account_name,
            is_verified=True,
            verified_at=now,
        )
    else:
        row.bank_code = bank_code
        row.bank_account_number = bank_account_number
        row.account_name = account_name
        row.is_verified = True
        row.verified_at = now

    db.add(row)
    db.commit()
    db.refresh(row)

    return _to_bank_account_response(row)


@router.get("/withdrawal/precheck", response_model=WithdrawalPrecheckResponse)
def withdrawal_precheck(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WithdrawalPrecheckResponse:
    has_funded_account = _user_has_funded_account(db, current_user.id)

    bank = db.scalar(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id))
    bank_verified = bool(bank and bank.is_verified)
    kyc_completed = (current_user.kyc_status or "").lower() in KYC_COMPLETED_STATUSES

    if not has_funded_account:
        return WithdrawalPrecheckResponse(
            kyc_completed=kyc_completed,
            bank_account_verified=bank_verified,
            has_funded_account=False,
            eligible_for_withdrawal=False,
            message="You need at least one funded account before requesting withdrawal.",
            payout_destination=None,
        )

    if not bank_verified:
        return WithdrawalPrecheckResponse(
            kyc_completed=kyc_completed,
            bank_account_verified=False,
            has_funded_account=True,
            eligible_for_withdrawal=False,
            message="Verify your bank account details before requesting withdrawal.",
            payout_destination=None,
        )

    if not kyc_completed:
        return WithdrawalPrecheckResponse(
            kyc_completed=False,
            bank_account_verified=True,
            has_funded_account=True,
            eligible_for_withdrawal=False,
            message="Complete KYC verification to request withdrawal.",
            payout_destination=None,
        )

    return WithdrawalPrecheckResponse(
        kyc_completed=True,
        bank_account_verified=True,
        has_funded_account=True,
        eligible_for_withdrawal=True,
        message="Withdrawal eligible. Verified bank details will be used for payout.",
        payout_destination=_to_bank_account_response(bank),
    )


@router.get("/challenge-accounts", response_model=UserChallengeAccountListResponse)
def list_my_challenge_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserChallengeAccountListResponse:
    challenges = db.scalars(
        select(ChallengeAccount)
        .where(ChallengeAccount.user_id == current_user.id)
        .order_by(ChallengeAccount.id.desc())
    ).all()

    if not challenges:
        return UserChallengeAccountListResponse(
            has_any_accounts=False,
            has_active_accounts=False,
            active_accounts=[],
            history_accounts=[],
        )

    mt5_ids = {
        cid
        for challenge in challenges
        for cid in [
            challenge.active_mt5_account_id,
            challenge.phase1_mt5_account_id,
            challenge.phase2_mt5_account_id,
            challenge.funded_mt5_account_id,
            challenge.last_withdrawn_mt5_account_id,
        ]
        if cid is not None
    }
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(list(mt5_ids)))).all() if mt5_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}

    active_accounts: list[UserChallengeAccountListItem] = []
    history_accounts: list[UserChallengeAccountListItem] = []
    for challenge in challenges:
        mt5 = _resolve_current_mt5(challenge, mt5_by_id)
        item = _challenge_list_item(challenge, mt5)
        if item.is_active:
            active_accounts.append(item)
        else:
            history_accounts.append(item)

    return UserChallengeAccountListResponse(
        has_any_accounts=True,
        has_active_accounts=len(active_accounts) > 0,
        active_accounts=active_accounts,
        history_accounts=history_accounts,
    )


@router.get("/challenge-accounts/{challenge_id}", response_model=UserChallengeAccountDetailResponse)
def get_my_challenge_account_detail(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserChallengeAccountDetailResponse:
    challenge = db.scalar(
        select(ChallengeAccount)
        .where(ChallengeAccount.user_id == current_user.id)
        .where(ChallengeAccount.challenge_id == challenge_id.strip())
    )
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge account not found")

    mt5_ids = {
        cid
        for cid in [
            challenge.active_mt5_account_id,
            challenge.phase1_mt5_account_id,
            challenge.phase2_mt5_account_id,
            challenge.funded_mt5_account_id,
            challenge.last_withdrawn_mt5_account_id,
        ]
        if cid is not None
    }
    mt5_rows = db.scalars(select(MT5Account).where(MT5Account.id.in_(list(mt5_ids)))).all() if mt5_ids else []
    mt5_by_id = {row.id: row for row in mt5_rows}
    mt5 = _resolve_current_mt5(challenge, mt5_by_id)

    min_days_required, stage_elapsed_hours, min_days_met = is_min_trading_days_met(db, challenge)
    profit_target_hit = round(challenge.highest_balance, 2) >= round(challenge.profit_target_balance, 2) if challenge.profit_target_balance > 0 else False

    # Determine which specific objective was breached
    max_dd_breached = challenge.breached_reason in {"drawdown_limit", "equity_signal", "balance_signal"}
    scalping_breached = challenge.breached_reason == "scalping_rule"

    balance = float(challenge.latest_balance or challenge.initial_balance)
    equity = float(challenge.latest_equity if challenge.latest_equity is not None else balance)

    # For breached accounts, show red X only for the breached objective
    # For active accounts, show appropriate status for each objective
    is_account_breached = challenge.objective_status == "breached"

    objectives: dict[str, UserChallengeObjectiveStatus] = {
        "max_drawdown": UserChallengeObjectiveStatus(
            label="Max Drawdown",
            status="breached" if (is_account_breached and max_dd_breached) else "passed",
            note=f"Breach balance: ₦{challenge.breach_balance:,.2f}",
        ),
        "profit_target": UserChallengeObjectiveStatus(
            label="Profit Target",
            status="passed" if profit_target_hit else "pending",
            note=f"Target balance: ₦{challenge.profit_target_balance:,.2f}",
        ),
        "scalping_rule": UserChallengeObjectiveStatus(
            label="Scalping Rule",
            status="breached" if (is_account_breached and scalping_breached) else "passed",
            note=f"Violations: {challenge.scalping_violations_count}",
        ),
        "min_trading_days": UserChallengeObjectiveStatus(
            label="Min Trading Days",
            status="passed" if min_days_met else "pending",
            note=f"{stage_elapsed_hours:.2f}h / {min_days_required * 24:.2f}h",
        ),
    }

    return UserChallengeAccountDetailResponse(
        challenge_id=challenge.challenge_id,
        account_size=challenge.account_size,
        phase=challenge.current_stage,
        objective_status=challenge.objective_status,
        breached_reason=challenge.breached_reason,
        started_at=challenge.stage_started_at.isoformat() if challenge.stage_started_at else challenge.created_at.isoformat(),
        breached_at=challenge.breached_at.isoformat() if challenge.breached_at else None,
        passed_at=challenge.passed_at.isoformat() if challenge.passed_at else None,
        mt5_account=mt5.account_number if mt5 else None,
        last_feed_at=challenge.last_feed_at.isoformat() if challenge.last_feed_at else None,
        last_refresh_requested_at=challenge.last_refresh_requested_at.isoformat() if challenge.last_refresh_requested_at else None,
        metrics=UserChallengeMetrics(
            balance=round(balance, 2),
            equity=round(equity, 2),
            unrealized_pnl=compute_unrealized_pnl(challenge),
            max_permitted_loss_left=compute_max_permitted_loss_left(challenge),
            highest_balance=round(challenge.highest_balance, 2),
            breach_balance=round(challenge.breach_balance, 2),
            profit_target_balance=round(challenge.profit_target_balance, 2),
            win_rate=compute_win_rate(challenge),
            closed_trades_count=challenge.closed_trades_count,
            winning_trades_count=challenge.winning_trades_count,
            lots_traded_total=round(challenge.lots_traded_total, 2),
            today_closed_pnl=round(challenge.today_closed_pnl, 2),
            today_trades_count=challenge.today_trades_count,
            today_lots_total=round(challenge.today_lots_total, 2),
            min_trading_days_required=min_days_required,
            min_trading_days_met=min_days_met,
            stage_elapsed_hours=round(stage_elapsed_hours, 2),
            scalping_violations_count=challenge.scalping_violations_count,
        ),
        objectives=objectives,
        credentials=(
            UserChallengeCredentials(
                server=mt5.server,
                account_number=mt5.account_number,
                password=mt5.password,
                investor_password=mt5.investor_password,
            )
            if mt5 is not None
            else None
        ),
        # Funded account profit data
        funded_profit_raw=round(challenge.funded_profit_raw, 2) if challenge.funded_profit_raw is not None else None,
        funded_profit_capped=round(challenge.funded_profit_capped, 2) if challenge.funded_profit_capped is not None else None,
        funded_profit_cap_amount=round(challenge.funded_profit_cap_amount, 2) if challenge.funded_profit_cap_amount is not None else None,
        funded_user_payout_amount=round(challenge.funded_user_payout_amount, 2) if challenge.funded_user_payout_amount is not None else None,
    )


@router.post("/challenge-accounts/{challenge_id}/refresh", response_model=ChallengeRefreshResponse)
def refresh_challenge_account(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChallengeRefreshResponse:
    challenge = db.scalar(
        select(ChallengeAccount)
        .where(ChallengeAccount.user_id == current_user.id)
        .where(ChallengeAccount.challenge_id == challenge_id.strip())
    )
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge account not found")

    # Check cooldown (60 seconds)
    now = datetime.now(timezone.utc)
    if challenge.last_refresh_requested_at and (now - challenge.last_refresh_requested_at).total_seconds() < 60:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Refresh request too frequent. Please wait before requesting again.",
        )

    # Get the active MT5 account for this challenge
    mt5 = _resolve_current_mt5(challenge, {})
    if not mt5:
        # Try to fetch it properly
        mt5_ids = {
            cid
            for cid in [
                challenge.active_mt5_account_id,
                challenge.funded_mt5_account_id,
                challenge.phase2_mt5_account_id,
                challenge.phase1_mt5_account_id,
            ]
            if cid is not None
        }
        if mt5_ids:
            mt5 = db.scalar(select(MT5Account).where(MT5Account.id.in_(list(mt5_ids))))

    if not mt5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active MT5 account found for this challenge")

    # Check if there's already an active refresh job for this account
    existing_job = db.scalar(
        select(MT5RefreshJob)
        .where(MT5RefreshJob.account_number == mt5.account_number)
        .where(MT5RefreshJob.status.in_(["queued", "processing"]))
        .order_by(MT5RefreshJob.requested_at.desc())
    )

    if existing_job:
        # Update challenge's last refresh request time even for existing jobs
        challenge.last_refresh_requested_at = now
        db.add(challenge)
        db.commit()
        return ChallengeRefreshResponse(status="already_queued", job_id=existing_job.id)

    # Create new refresh job
    job = MT5RefreshJob(
        account_number=mt5.account_number,
        reason=RefreshReason.user_refresh,
        status="queued",
        requested_by_user_id=current_user.id,
        requested_at=now,
    )
    db.add(job)

    # Update challenge's last refresh request time
    challenge.last_refresh_requested_at = now
    db.add(challenge)

    db.commit()
    db.refresh(job)

    return ChallengeRefreshResponse(status="queued", job_id=job.id)

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.core.config import settings
from app.db.deps import get_db
from app.models.admin_allowlist import AdminAllowlist
from app.models.admin_activity import AdminActivityLog
from app.models.challenge_account import ChallengeAccount
from app.models.migration_request import MigrationRequest
from app.models.mt5_account import MT5Account
from app.models.user import User
from app.schemas.migration_request import MigrationRequestResponse, MigrationRequestUpdate
from app.services.challenge_objectives import rollover_funded_account_after_withdrawal
from app.tasks import send_challenge_objective_email
from app.services.palmpay_service import PalmPayService
from app.api.admin_workboard_routes import log_admin_activity


router = APIRouter(prefix="/admin/migration-requests", tags=["Admin Migration"])




@router.get("", response_model=list[MigrationRequestResponse])
def list_migration_requests(
    status_filter: Optional[str] = None,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> list[MigrationRequestResponse]:
    query = select(MigrationRequest)

    if status_filter:
        query = query.where(MigrationRequest.status == status_filter)

    requests = db.scalars(query.order_by(MigrationRequest.created_at.desc())).all()
    return [MigrationRequestResponse.model_validate(request) for request in requests]


@router.get("/{request_id}", response_model=MigrationRequestResponse)
def get_migration_request(
    request_id: int,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> MigrationRequestResponse:
    request = db.get(MigrationRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Migration request not found")

    return MigrationRequestResponse.model_validate(request)


@router.put("/{request_id}", response_model=MigrationRequestResponse)
def update_migration_request(
    request_id: int,
    update_data: MigrationRequestUpdate,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> MigrationRequestResponse:
    request = db.get(MigrationRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Migration request not found")

    if update_data.status not in ["approved", "declined"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    # Find the admin_allowlist entry for this admin user
    admin_entry = db.scalar(
        select(AdminAllowlist).where(
            (AdminAllowlist.email == current_admin.email) |
            (AdminAllowlist.descope_user_id == current_admin.descope_user_id)
        )
    )

    if not admin_entry:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin not found in allowlist")

    # Update the request
    request.status = update_data.status
    request.admin_notes = update_data.admin_notes
    request.processed_by_admin_id = admin_entry.id  # Use admin_allowlist.id, not users.id
    request.processed_at = datetime.now(timezone.utc)

    if update_data.status == "approved":
        try:
            _process_approved_migration_request(db, request, current_admin, update_data.withdrawal_amount)
            # Log the approval activity
            withdrawal_info = f" with ₦{update_data.withdrawal_amount:,.2f} payout" if update_data.withdrawal_amount else ""
            log_admin_activity(
                db,
                admin_entry.id,
                current_admin.full_name or current_admin.email,
                "approve_migration_request",
                f"Approved {request.request_type} migration request for user {request.user_id} ({request.account_size}){withdrawal_info}",
                "migration_request",
                request.id
            )
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process migration: {str(e)}")
    elif update_data.status == "declined":
        # Log the decline activity
        log_admin_activity(
            db,
            admin_entry.id,
            current_admin.full_name or current_admin.email,
            "decline_migration_request",
            f"Declined {request.request_type} migration request for user {request.user_id} ({request.account_size})",
            "migration_request",
            request.id
        )

    db.commit()
    db.refresh(request)

    return MigrationRequestResponse.model_validate(request)


def _process_approved_migration_request(
    db: Session,
    request: MigrationRequest,
    admin: User,
    withdrawal_amount: Optional[float] = None
) -> None:
    """Process an approved migration request."""
    user = db.get(User, request.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if request.request_type == "phase2":
        _process_phase2_migration(db, request, user, admin)
    elif request.request_type in ["funded", "funded_request"]:
        _process_funded_migration(db, request, user, admin, withdrawal_amount)


def _process_phase2_migration(
    db: Session,
    request: MigrationRequest,
    user: User,
    admin: User
) -> None:
    """Process Phase 2 migration request."""
    # Find an available Phase 2 account of the same size
    # Note: MT5 account sizes have " Account" suffix (e.g., "₦400k Account")
    mt5_account_size = f"{request.account_size} Account"
    mt5_account = db.scalar(
        select(MT5Account)
        .where(
            MT5Account.status == "Ready",
            MT5Account.account_size == mt5_account_size
        )
        .order_by(MT5Account.id.asc())
    )

    if not mt5_account:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No Phase 2 account available for this size")

    # Create new challenge account for Phase 2
    from app.services.challenge_objectives import initialize_challenge_stage_tracking

    challenge = ChallengeAccount(
        user_id=user.id,
        challenge_id=f"{user.id}-phase2-{request.account_size.lower().replace('₦', '').replace(',', '')}",
        account_size=request.account_size,
        current_stage="Phase 2",
        phase2_mt5_account_id=mt5_account.id,
        active_mt5_account_id=mt5_account.id,
    )

    initialize_challenge_stage_tracking(challenge, account_size=request.account_size)

    # Update MT5 account
    mt5_account.status = "Phase 2"
    mt5_account.assignment_mode = "migration"
    mt5_account.assigned_user_id = user.id
    mt5_account.assigned_by_admin_name = admin.full_name or admin.email
    mt5_account.assigned_at = datetime.now(timezone.utc)

    db.add(challenge)
    db.add(mt5_account)

    # Send email notification
    try:
        send_challenge_objective_email.delay(
            to_email=user.email,
            subject="Phase 2 Migration Approved",
            message=(
                f"Your Phase 2 migration request has been approved!\n\n"
                f"Your new Phase 2 account details:\n"
                f"• Account Number: {mt5_account.account_number}\n"
                f"• Server: {mt5_account.server}\n"
                f"• Password: {mt5_account.password}\n\n"
                f"You can now log in to your MT5 platform and continue trading."
            )
        )
    except Exception:
        pass  # Don't fail the migration if email fails


def _process_funded_migration(
    db: Session,
    request: MigrationRequest,
    user: User,
    admin: User,
    withdrawal_amount: Optional[float] = None
) -> None:
    """Process funded migration request."""
    # For "funded" type, validate withdrawal amount
    if request.request_type == "funded":
        if withdrawal_amount is None or withdrawal_amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Withdrawal amount is required and must be greater than 0 for payout requests")

    # Find an available funded account of the same size
    # Note: MT5 account sizes have " Account" suffix (e.g., "₦400k Account")
    mt5_account_size = f"{request.account_size} Account"
    mt5_account = db.scalar(
        select(MT5Account)
        .where(
            MT5Account.status == "Ready",
            MT5Account.account_size == mt5_account_size
        )
        .order_by(MT5Account.id.asc())
    )

    if not mt5_account:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No funded account available for this size")

    # Process withdrawal if amount is provided and greater than 0
    if withdrawal_amount and withdrawal_amount > 0:
        # Process the withdrawal via PalmPay
        palm_pay = PalmPayService()
        transfer_result = palm_pay.create_transfer(
            amount=withdrawal_amount,
            account_number=request.bank_account_number,
            bank_code=request.bank_code,
            account_name=request.account_name,
            description=f"Funded account migration withdrawal for {user.email}"
        )

        request.withdrawal_amount = withdrawal_amount
        request.transfer_reference = transfer_result.get("reference")



    # Create new challenge account for funded
    from app.services.challenge_objectives import initialize_challenge_stage_tracking

    challenge = ChallengeAccount(
        user_id=user.id,
        challenge_id=f"{user.id}-funded-{request.account_size.lower().replace('₦', '').replace(',', '')}",
        account_size=request.account_size,
        current_stage="Funded",
        funded_mt5_account_id=mt5_account.id,
        active_mt5_account_id=mt5_account.id,
    )

    initialize_challenge_stage_tracking(challenge, account_size=request.account_size)

    # Update MT5 account
    mt5_account.status = "Funded"
    mt5_account.assignment_mode = "migration"
    mt5_account.assigned_user_id = user.id
    mt5_account.assigned_by_admin_name = admin.full_name or admin.email
    mt5_account.assigned_at = datetime.now(timezone.utc)

    db.add(challenge)
    db.add(mt5_account)

    # Send email notification
    try:
        message = (
            f"Your funded account migration request has been approved!\n\n"
            f"Your new funded account details:\n"
            f"• Account Number: {mt5_account.account_number}\n"
            f"• Server: {mt5_account.server}\n"
            f"• Password: {mt5_account.password}\n\n"
        )

        if withdrawal_amount and withdrawal_amount > 0:
            message += f"A withdrawal of ₦{withdrawal_amount:,.2f} has been processed to your bank account.\n\n"

        message += "You can now log in to your MT5 platform and start trading with your funded account."

        send_challenge_objective_email.delay(
            to_email=user.email,
            subject="Funded Account Migration Approved",
            message=message
        )
    except Exception:
        pass  # Don't fail the migration if email fails


def _calculate_funded_withdrawal_amount(db: Session, user: User, account_size: str) -> float:
    """Calculate the total withdrawal amount from existing funded accounts."""
    # Get all funded accounts for this user
    funded_accounts = db.scalars(
        select(ChallengeAccount)
        .where(
            ChallengeAccount.user_id == user.id,
            ChallengeAccount.current_stage == "Funded",
            ChallengeAccount.objective_status != "breached"
        )
    ).all()

    total_withdrawal = 0
    for account in funded_accounts:
        if account.funded_user_payout_amount and account.funded_user_payout_amount > 0:
            total_withdrawal += account.funded_user_payout_amount

            # Mark the old account as withdrawn
            if account.active_mt5_account_id:
                old_mt5 = db.get(MT5Account, account.active_mt5_account_id)
                if old_mt5:
                    old_mt5.status = "Withdrawn"
                    db.add(old_mt5)

            account.objective_status = "withdrawn"
            db.add(account)

    return total_withdrawal


@router.delete("/{request_id}")
def delete_migration_request(
    request_id: int,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    request = db.get(MigrationRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Migration request not found")

    if request.status == "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete approved requests")

    db.delete(request)
    db.commit()

    return {"message": "Migration request deleted successfully"}
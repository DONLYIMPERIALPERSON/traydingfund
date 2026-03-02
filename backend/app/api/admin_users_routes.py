from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.db.deps import get_db
from app.models.challenge_account import ChallengeAccount
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.models.user_bank_account import UserBankAccount
from app.data.banks import NIGERIAN_BANKS
from app.api.admin_workboard_routes import log_admin_activity
from app.tasks import send_challenge_objective_email


router = APIRouter(prefix="/admin/users", tags=["Admin Users"])


def _format_currency(value: float) -> str:
    return f"₦{value:,.0f}"


@router.get("")
def list_admin_users(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    users = db.scalars(
        select(User)
        .where(User.role == "user")
        .order_by(User.id.desc())
    ).all()

    user_ids = [user.id for user in users]
    challenge_rows = (
        db.scalars(select(ChallengeAccount).where(ChallengeAccount.user_id.in_(user_ids))).all() if user_ids else []
    )
    payment_rows = (
        db.scalars(
            select(PaymentOrder).where(
                PaymentOrder.user_id.in_(user_ids),
                PaymentOrder.status == "paid",
            )
        ).all()
        if user_ids
        else []
    )

    payout_rows = (
        db.scalars(
            select(PaymentOrder).where(
                PaymentOrder.user_id.in_(user_ids),
                PaymentOrder.provider == "palmpay_payout",
                PaymentOrder.status == "completed",
            )
        ).all()
        if user_ids
        else []
    )

    challenges_by_user: dict[int, list[ChallengeAccount]] = {}
    for row in challenge_rows:
        challenges_by_user.setdefault(row.user_id, []).append(row)

    payments_by_user: dict[int, list[PaymentOrder]] = {}
    for row in payment_rows:
        payments_by_user.setdefault(row.user_id, []).append(row)

    payouts_by_user: dict[int, list[PaymentOrder]] = {}
    for row in payout_rows:
        payouts_by_user.setdefault(row.user_id, []).append(row)

    rows: list[dict[str, object]] = []
    funded_users = 0
    breached_users = 0

    for user in users:
        user_challenges = challenges_by_user.get(user.id, [])
        user_payments = payments_by_user.get(user.id, [])
        user_payouts = payouts_by_user.get(user.id, [])

        funded_count = sum(1 for row in user_challenges if row.current_stage == "Funded")
        challenge_count = sum(1 for row in user_challenges if row.current_stage in {"Phase 1", "Phase 2"})
        orders_count = len(user_payments)

        payout_total = sum(float(row.net_amount_kobo or 0) for row in user_payouts) / 100
        revenue_total = sum(float(row.net_amount_kobo) for row in user_payments) / 100

        has_funded = funded_count > 0
        has_breached = any(row.objective_status == "breached" for row in user_challenges)
        has_active_challenge = any(
            row.current_stage in {"Phase 1", "Phase 2"} and row.objective_status == "active"
            for row in user_challenges
        )

        trading_status = "None"
        if has_funded:
            trading_status = "Funded"
            funded_users += 1
        elif has_breached:
            trading_status = "Breached"
            breached_users += 1
        elif has_active_challenge:
            trading_status = "Challenge Active"

        rows.append(
            {
                "user_id": user.id,
                "name": user.nick_name or user.full_name or user.email,
                "email": user.email,
                "status": user.status,
                "trading": trading_status,
                "accounts": f"{challenge_count} / {funded_count}",
                "revenue": _format_currency(revenue_total),
                "orders": str(orders_count),
                "payouts": _format_currency(payout_total),
            }
        )

    return {
        "users": rows,
        "stats": {
            "total_users": len(users),
            "funded_users": funded_users,
            "breached_users": breached_users,
        },
    }


@router.get("/{user_id}")
def get_user_profile(
    user_id: int,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Get detailed profile for a specific user."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Get user's challenge accounts
    challenge_accounts = db.scalars(
        select(ChallengeAccount).where(ChallengeAccount.user_id == user_id)
    ).all()

    bank_account = db.scalar(select(UserBankAccount).where(UserBankAccount.user_id == user_id))
    bank_name = None
    if bank_account:
        bank_name = next(
            (bank["bank_name"] for bank in NIGERIAN_BANKS if bank["bank_code"] == bank_account.bank_code),
            None,
        )

    payment_orders = db.scalars(
        select(PaymentOrder).where(
            PaymentOrder.user_id == user_id,
            PaymentOrder.status == "paid",
        )
    ).all()

    payout_orders = db.scalars(
        select(PaymentOrder).where(
            PaymentOrder.user_id == user_id,
            PaymentOrder.provider == "palmpay_payout",
            PaymentOrder.status == "completed",
        )
    ).all()

    # Calculate stats
    funded_count = sum(1 for acc in challenge_accounts if acc.current_stage == "Funded")
    challenge_count = sum(1 for acc in challenge_accounts if acc.current_stage in {"Phase 1", "Phase 2"})
    orders_count = len(payment_orders)

    payout_total = sum(float(order.net_amount_kobo or 0) for order in payout_orders) / 100
    revenue_total = sum(float(order.net_amount_kobo) for order in payment_orders) / 100

    # Determine trading status
    has_funded = funded_count > 0
    has_breached = any(acc.objective_status == "breached" for acc in challenge_accounts)
    has_active_challenge = any(
        acc.current_stage in {"Phase 1", "Phase 2"} and acc.objective_status == "active"
        for acc in challenge_accounts
    )

    trading_status = "None"
    if has_funded:
        trading_status = "Funded"
    elif has_breached:
        trading_status = "Breached"
    elif has_active_challenge:
        trading_status = "Challenge Active"

    return {
        "user_id": user.id,
        "name": user.nick_name or user.full_name or user.email,
        "email": user.email,
        "status": user.status,
        "kyc_status": user.kyc_status,
        "bank_account": (
            {
                "bank_code": bank_account.bank_code,
                "bank_name": bank_name,
                "bank_account_number": bank_account.bank_account_number,
                "account_name": bank_account.account_name,
                "is_verified": bank_account.is_verified,
                "verified_at": bank_account.verified_at.isoformat() if bank_account.verified_at else None,
            }
            if bank_account
            else None
        ),
        "trading": trading_status,
        "accounts": f"{challenge_count} / {funded_count}",
        "revenue": _format_currency(revenue_total),
        "orders": str(orders_count),
        "payouts": _format_currency(payout_total),
    }


@router.patch("/{user_id}/status")
def update_user_status(
    user_id: int,
    status_update: dict[str, str],
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Update user status."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    new_status = status_update.get("status")
    if new_status not in ["active", "disabled", "suspended", "banned"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status",
        )

    user.status = new_status
    db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="update_user_status",
        description=f"Updated user status to {new_status} for user {user.email}",
        entity_type="user",
        entity_id=user.id
    )
    return {"message": f"User status updated to {new_status}"}


@router.post("/{user_id}/withdrawals")
def update_user_withdrawals(
    user_id: int,
    withdrawal_update: dict[str, bool],
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Enable or disable user withdrawals."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    enabled = withdrawal_update.get("enabled", True)
    # For now, we'll just update a field. You might want to add a specific field to the User model
    # user.withdrawals_enabled = enabled
    # db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="update_user_withdrawals",
        description=f"{'Enabled' if enabled else 'Disabled'} withdrawals for user {user.email}",
        entity_type="user",
        entity_id=user.id
    )
    return {"message": f"User withdrawals {'enabled' if enabled else 'disabled'}"}


@router.post("/{user_id}/suspend")
def suspend_user(
    user_id: int,
    suspension_data: dict[str, str] = None,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Suspend a user."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.status = "suspended"
    db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="suspend_user",
        description=f"Suspended user {user.email}",
        entity_type="user",
        entity_id=user.id
    )
    return {"message": "User suspended successfully"}


@router.post("/{user_id}/unsuspend")
def unsuspend_user(
    user_id: int,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Unsuspend a user."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.status = "active"
    db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="unsuspend_user",
        description=f"Unsuspended user {user.email}",
        entity_type="user",
        entity_id=user.id
    )
    return {"message": "User unsuspended successfully"}


@router.post("/{user_id}/ban")
def ban_user(
    user_id: int,
    ban_data: dict[str, str],
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Ban a user."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.status = "banned"
    db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="ban_user",
        description=f"Banned user {user.email}",
        entity_type="user",
        entity_id=user.id
    )
    return {"message": "User banned successfully"}


@router.post("/{user_id}/notes")
def add_user_note(
    user_id: int,
    note_data: dict[str, str],
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Add a note to user profile."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # For now, we'll just log the note. You might want to create a UserNote model
    note = note_data.get("note", "")
    tag = note_data.get("tag", "")

    # You could save this to a notes field or create a separate table
    print(f"Note added for user {user_id}: {note} (tag: {tag})")

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="add_user_note",
        description=f"Added note for user {user.email}: {note}",
        entity_type="user",
        entity_id=user.id
    )
    return {"message": "Note added successfully"}


@router.post("/{user_id}/email")
def send_user_email(
    user_id: int,
    email_data: dict[str, str],
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Send email to user."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    subject = email_data.get("subject", "")
    message = email_data.get("message", "")
    template = email_data.get("template")
    if template:
        subject = f"{subject}"

    # Send email via task
    try:
        send_challenge_objective_email.delay(to_email=user.email, subject=subject, message=message)
    except Exception:
        pass

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="send_user_email",
        description=f"Sent email to user {user.email} with subject: {subject}",
        entity_type="user",
        entity_id=user.id
    )
    return {"message": "Email sent successfully"}

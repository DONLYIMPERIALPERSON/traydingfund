from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.db.deps import get_db
from app.models.affiliate import (
    Affiliate,
    AffiliateCommission,
    AffiliatePayout,
    AffiliateMilestone,
    AffiliateClick,
)
from app.models.user import User
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.services.challenge_objectives import initialize_challenge_stage_tracking
from app.api.admin_workboard_routes import log_admin_activity
from app.tasks import send_challenge_objective_email


router = APIRouter(prefix="/admin/affiliate", tags=["Admin Affiliate"])

REWARD_AMOUNT_BY_LEVEL = {
    5: 200000,
    15: 400000,
    30: 600000,
    50: 800000,
}


@router.get("/overview")
def get_affiliate_overview(
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict:
    """Get affiliate overview statistics."""
    # Total affiliates
    total_affiliates = db.scalar(select(func.count(Affiliate.user_id)))

    # Total commissions (approved)
    total_commissions = db.scalar(
        select(func.sum(AffiliateCommission.amount))
        .where(AffiliateCommission.status == "approved")
    ) or 0.0

    # Total paid out (approved payouts)
    total_paid_out = db.scalar(
        select(func.sum(AffiliatePayout.amount))
        .where(AffiliatePayout.status == "approved")
    ) or 0.0

    # Pending payouts count and sum
    pending_payouts_count = db.scalar(
        select(func.count(AffiliatePayout.id))
        .where(AffiliatePayout.status == "pending")
    )

    pending_payouts_sum = db.scalar(
        select(func.sum(AffiliatePayout.amount))
        .where(AffiliatePayout.status == "pending")
    ) or 0.0

    # Pending milestones
    pending_milestones = db.scalar(
        select(func.count(AffiliateMilestone.id))
        .where(AffiliateMilestone.status == "pending")
    )

    # Unique purchasers
    unique_purchasers = db.scalar(
        select(func.count(func.distinct(AffiliateCommission.unique_customer_key)))
        .where(AffiliateCommission.status == "approved")
    )

    return {
        "total_affiliates": total_affiliates,
        "total_commissions": round(total_commissions, 2),
        "total_paid_out": round(total_paid_out, 2),
        "pending_payouts_count": pending_payouts_count,
        "pending_payouts_sum": round(pending_payouts_sum, 2),
        "pending_milestones": pending_milestones,
        "unique_purchasers": unique_purchasers,
    }


@router.get("/commissions")
def get_commissions(
    page: int = 1,
    per_page: int = 50,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict:
    """Get paginated list of commissions."""
    if page < 1:
        page = 1
    if per_page < 10 or per_page > 500:
        per_page = 50

    offset = (page - 1) * per_page

    # Get total count
    total = db.scalar(select(func.count(AffiliateCommission.id)))

    # Get paginated results with affiliate user info
    commissions = db.scalars(
        select(AffiliateCommission)
        .order_by(desc(AffiliateCommission.created_at))
        .offset(offset)
        .limit(per_page)
    ).all()

    # Format for response
    commission_list = []
    for comm in commissions:
        # Get affiliate user info
        affiliate_user = db.scalar(
            select(User).where(User.id == comm.affiliate_id)
        )
        affiliate_name = affiliate_user.username if affiliate_user else f"User #{comm.affiliate_id}"

        commission_list.append({
            "id": comm.id,
            "date": comm.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "affiliate": affiliate_name,
            "order_id": comm.order_id,
            "customer": comm.customer_email or f"User #{comm.customer_user_id}" if comm.customer_user_id else "N/A",
            "amount": round(comm.amount, 2),
            "status": comm.status,
            "product_summary": comm.product_summary,
        })

    return {
        "commissions": commission_list,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        }
    }


@router.get("/payouts")
def get_payouts(
    page: int = 1,
    per_page: int = 50,
    status_filter: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict:
    """Get paginated list of payouts."""
    if page < 1:
        page = 1
    if per_page < 10 or per_page > 200:
        per_page = 50

    offset = (page - 1) * per_page

    # Build query
    query = select(AffiliatePayout)

    if status_filter in ["pending", "approved", "rejected"]:
        query = query.where(AffiliatePayout.status == status_filter)

    # Get total count
    total = db.scalar(
        select(func.count(AffiliatePayout.id))
        .where(AffiliatePayout.status == status_filter) if status_filter else select(func.count(AffiliatePayout.id))
    )

    # Get paginated results
    payouts = db.scalars(
        query.order_by(desc(AffiliatePayout.requested_at))
        .offset(offset)
        .limit(per_page)
    ).all()

    # Format for response
    payout_list = []
    for payout in payouts:
        # Get affiliate user info
        affiliate_user = db.scalar(
            select(User).where(User.id == payout.affiliate_id)
        )
        affiliate_name = affiliate_user.username if affiliate_user else f"User #{payout.affiliate_id}"

        # Get bank details
        bank_details = "Not set"
        from app.models.user_bank_account import UserBankAccount
        bank_account = db.scalar(
            select(UserBankAccount).where(UserBankAccount.user_id == payout.affiliate_id)
        )
        if bank_account:
            from app.data.banks import NIGERIAN_BANKS
            bank_name = "Unknown Bank"
            for bank in NIGERIAN_BANKS:
                if bank["bank_code"] == bank_account.bank_code:
                    bank_name = bank["bank_name"]
                    break
            bank_details = f"{bank_account.account_name} — {bank_name} ({bank_account.bank_account_number})"

        payout_list.append({
            "id": payout.id,
            "affiliate": affiliate_name,
            "amount": round(payout.amount, 2),
            "status": payout.status,
            "bank_details": bank_details,
            "requested_at": payout.requested_at.strftime("%Y-%m-%d %H:%M:%S"),
            "approved_at": payout.approved_at.strftime("%Y-%m-%d %H:%M:%S") if payout.approved_at else None,
        })

    return {
        "payouts": payout_list,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        }
    }


@router.post("/payouts/{payout_id}/approve")
def approve_payout(
    payout_id: int,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Approve a payout request."""
    payout = db.scalar(
        select(AffiliatePayout).where(AffiliatePayout.id == payout_id)
    )

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout not found",
        )

    if payout.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payout is not pending",
        )

    # Get affiliate info for logging
    affiliate_user = db.scalar(
        select(User).where(User.id == payout.affiliate_id)
    )
    affiliate_name = affiliate_user.username if affiliate_user else f"User #{payout.affiliate_id}"

    # Update payout status
    payout.status = "approved"
    payout.approved_at = datetime.utcnow()
    db.commit()

    # Log admin activity
    admin_name = current_admin.email  # Use email as admin identifier
    log_admin_activity(
        db, current_admin.id, admin_name, "approve_payout",
        f"Approved affiliate payout of ₦{payout.amount:,.2f} for {affiliate_name}",
        "payout", payout_id
    )
    # Log admin activity
    admin_name = current_admin.email  # Use email as admin identifier
    log_admin_activity(
        db, current_admin.id, admin_name, "approve_payout",
        f"Approved affiliate payout of ₦{payout.amount:,.2f} for {affiliate_name}",
        "payout", payout_id
    )

    # Send email notification to affiliate
    if affiliate_user and affiliate_user.email:
        try:
            message = (
                f"Your affiliate payout of ₦{payout.amount:,.2f} has been approved and will be processed shortly."
            )
            send_challenge_objective_email.delay(
                to_email=affiliate_user.email,
                subject="Affiliate Payout Approved",
                message=message,
            )
        except Exception:
            pass

    return {"message": "Payout approved successfully"}


@router.post("/payouts/{payout_id}/reject")
def reject_payout(
    payout_id: int,
    reason: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Reject a payout request."""
    payout = db.scalar(
        select(AffiliatePayout).where(AffiliatePayout.id == payout_id)
    )

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout not found",
        )

    if payout.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payout is not pending",
        )

    # Get affiliate info for logging
    affiliate_user = db.scalar(
        select(User).where(User.id == payout.affiliate_id)
    )
    affiliate_name = affiliate_user.username if affiliate_user else f"User #{payout.affiliate_id}"

    # Update payout status
    payout.status = "rejected"
    payout.approved_at = datetime.utcnow()
    db.commit()

    # Log admin activity
    admin_name = current_admin.email
    description = f"Rejected affiliate payout of ₦{payout.amount:,.2f} for {affiliate_name}"
    if reason:
        description += f" (Reason: {reason})"

    log_admin_activity(
        db, current_admin.id, admin_name, "reject_payout",
        description, "payout", payout_id
    )
    # Log admin activity
    admin_name = current_admin.email
    description = f"Rejected affiliate payout of ₦{payout.amount:,.2f} for {affiliate_name}"
    if reason:
        description += f" (Reason: {reason})"

    log_admin_activity(
        db, current_admin.id, admin_name, "reject_payout",
        description, "payout", payout_id
    )

    # Send email notification to affiliate with reason
    if affiliate_user and affiliate_user.email:
        try:
            message = (
                f"Your affiliate payout of ₦{payout.amount:,.2f} was rejected. "
                f"Reason: {reason or 'Not provided'}."
            )
            send_challenge_objective_email.delay(
                to_email=affiliate_user.email,
                subject="Affiliate Payout Rejected",
                message=message,
            )
        except Exception:
            pass

    return {"message": "Payout rejected successfully"}


@router.get("/milestones")
def get_milestones(
    page: int = 1,
    per_page: int = 50,
    status_filter: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict:
    """Get paginated list of milestone requests."""
    if page < 1:
        page = 1
    if per_page < 10 or per_page > 200:
        per_page = 50

    offset = (page - 1) * per_page

    # Build query
    query = select(AffiliateMilestone)

    if status_filter in ["pending", "approved", "rejected"]:
        query = query.where(AffiliateMilestone.status == status_filter)

    # Get total count
    total = db.scalar(
        select(func.count(AffiliateMilestone.id))
        .where(AffiliateMilestone.status == status_filter) if status_filter else select(func.count(AffiliateMilestone.id))
    )

    # Get paginated results
    milestones = db.scalars(
        query.order_by(desc(AffiliateMilestone.requested_at))
        .offset(offset)
        .limit(per_page)
    ).all()

    # Format for response
    milestone_list = []
    for milestone in milestones:
        # Get affiliate user info
        affiliate_user = db.scalar(
            select(User).where(User.id == milestone.affiliate_id)
        )
        affiliate_name = affiliate_user.username if affiliate_user else f"User #{milestone.affiliate_id}"

        milestone_list.append({
            "id": milestone.id,
            "affiliate": affiliate_name,
            "level": milestone.level,
            "status": milestone.status,
            "requested_at": milestone.requested_at.strftime("%Y-%m-%d %H:%M:%S"),
            "processed_at": milestone.processed_at.strftime("%Y-%m-%d %H:%M:%S") if milestone.processed_at else None,
        })

    return {
        "milestones": milestone_list,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        }
    }


@router.post("/milestones/{milestone_id}/approve")
def approve_milestone(
    milestone_id: int,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Approve a milestone request."""
    milestone = db.scalar(
        select(AffiliateMilestone).where(AffiliateMilestone.id == milestone_id)
    )

    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestone not found",
        )

    if milestone.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Milestone is not pending",
        )

    # Get affiliate info for logging
    affiliate_user = db.scalar(
        select(User).where(User.id == milestone.affiliate_id)
    )
    affiliate_name = affiliate_user.username if affiliate_user else f"User #{milestone.affiliate_id}"

    reward_amount = REWARD_AMOUNT_BY_LEVEL.get(milestone.level)
    if reward_amount is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported milestone reward level",
        )
    reward_size = f"₦{reward_amount/1000:,.0f}k"

    mt5 = db.scalar(
        select(MT5Account)
        .where(MT5Account.status == "Ready", MT5Account.account_size == reward_size)
        .order_by(MT5Account.id.asc())
        .with_for_update(skip_locked=True)
    )
    if mt5 is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No ready MT5 account available for this reward size",
        )

    challenge_id = f"RW-{milestone.id:05d}"
    challenge = ChallengeAccount(
        challenge_id=challenge_id,
        user_id=milestone.affiliate_id,
        account_size=reward_size,
        current_stage="Phase 1",
        phase1_mt5_account_id=mt5.id,
        phase2_mt5_account_id=None,
        funded_mt5_account_id=None,
        active_mt5_account_id=mt5.id,
    )
    initialize_challenge_stage_tracking(challenge, account_size=reward_size)
    db.add(challenge)
    db.flush()

    mt5.status = "Phase 1"
    mt5.assignment_mode = "automatic"
    mt5.assigned_user_id = milestone.affiliate_id
    mt5.assigned_by_admin_name = "Affiliate Reward"
    mt5.assigned_at = datetime.utcnow()
    db.add(mt5)

    # Update milestone status
    milestone.status = "approved"
    milestone.processed_at = datetime.utcnow()
    db.add(milestone)
    db.commit()

    # Log admin activity
    admin_name = current_admin.email
    log_admin_activity(
        db, current_admin.id, admin_name, "approve_milestone",
        f"Approved milestone reward (Level {milestone.level}) for {affiliate_name}",
        "milestone", milestone_id
    )
    # Log admin activity
    admin_name = current_admin.email
    log_admin_activity(
        db, current_admin.id, admin_name, "approve_milestone",
        f"Approved milestone reward (Level {milestone.level}) for {affiliate_name}",
        "milestone", milestone_id
    )

    # Send email notification to affiliate
    if affiliate_user and affiliate_user.email:
        try:
            message = (
                f"Your affiliate milestone reward (Level {milestone.level}) has been approved.\n\n"
                f"Challenge ID: {challenge.challenge_id}\n"
                f"Account Size: {reward_size}\n"
                f"MT5 Server: {mt5.server}\n"
                f"Account Number: {mt5.account_number}\n"
                f"Password: {mt5.password}\n"
                f"Investor Password: {mt5.investor_password}\n\n"
                "You can now log in to your MT5 platform and start trading."
            )
            send_challenge_objective_email.delay(
                to_email=affiliate_user.email,
                subject="Affiliate Milestone Approved",
                message=message,
            )
        except Exception:
            pass
    return {"message": f"Milestone approved successfully. {reward_size} account assigned"}


@router.post("/milestones/{milestone_id}/reject")
def reject_milestone(
    milestone_id: int,
    reason: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Reject a milestone request."""
    milestone = db.scalar(
        select(AffiliateMilestone).where(AffiliateMilestone.id == milestone_id)
    )

    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestone not found",
        )

    if milestone.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Milestone is not pending",
        )

    # Get affiliate info for logging
    affiliate_user = db.scalar(
        select(User).where(User.id == milestone.affiliate_id)
    )
    affiliate_name = affiliate_user.username if affiliate_user else f"User #{milestone.affiliate_id}"

    # Update milestone status
    milestone.status = "rejected"
    milestone.processed_at = datetime.utcnow()
    db.commit()

    # Log admin activity
    admin_name = current_admin.email
    description = f"Rejected milestone reward (Level {milestone.level}) for {affiliate_name}"
    if reason:
        description += f" (Reason: {reason})"

    log_admin_activity(
        db, current_admin.id, admin_name, "reject_milestone",
        description, "milestone", milestone_id
    )
    # Log admin activity
    admin_name = current_admin.email
    description = f"Rejected milestone reward (Level {milestone.level}) for {affiliate_name}"
    if reason:
        description += f" (Reason: {reason})"

    log_admin_activity(
        db, current_admin.id, admin_name, "reject_milestone",
        description, "milestone", milestone_id
    )

    # Send email notification to affiliate with reason
    if affiliate_user and affiliate_user.email:
        try:
            message = (
                f"Your affiliate milestone reward (Level {milestone.level}) was rejected. "
                f"Reason: {reason or 'Not provided'}."
            )
            send_challenge_objective_email.delay(
                to_email=affiliate_user.email,
                subject="Affiliate Milestone Rejected",
                message=message,
            )
        except Exception:
            pass

    return {"message": "Milestone rejected successfully"}

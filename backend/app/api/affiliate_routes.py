import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from app.api.auth_routes import serialize_user
from app.core.auth import get_current_user
from app.db.deps import get_db
from app.models.affiliate import (
    Affiliate,
    AffiliateCommission,
    AffiliatePayout,
    AffiliateMilestone,
    AffiliateClick,
)
from app.models.user import User
from app.models.payment_order import PaymentOrder
from app.models.user_bank_account import UserBankAccount
from app.schemas.affiliate import (
    AffiliateDashboard,
    AffiliateStats,
    AffiliateReward,
    AffiliateTransaction,
    AffiliatePayoutHistory,
    PayoutRequest,
    MilestoneClaimRequest,
    BankDetails,
    BankDetailsUpdate,
)

router = APIRouter(prefix="/affiliate", tags=["Affiliate"])

# Milestone targets for referral rewards
MILESTONE_TARGETS = [5, 15, 30, 50]
REWARD_AMOUNTS = [200000, 400000, 600000, 800000]  # ₦200k, ₦400k, ₦600k, ₦800k


def _ensure_affiliate_row(db: Session, user_id: int) -> Affiliate:
    """Ensure an affiliate row exists for the user, creating one if needed."""
    affiliate = db.scalar(select(Affiliate).where(Affiliate.user_id == user_id))
    if affiliate:
        return affiliate

    # Generate unique 6-digit code
    while True:
        code = str(secrets.randbelow(900000) + 100000)  # 100000-999999
        existing = db.scalar(select(Affiliate).where(Affiliate.code == code))
        if not existing:
            break

    affiliate = Affiliate(
        user_id=user_id,
        code=code,
        created_at=datetime.utcnow(),
    )
    db.add(affiliate)
    db.commit()
    db.refresh(affiliate)
    return affiliate


def _get_affiliate_code(db: Session, user_id: int) -> str:
    """Get the affiliate code for a user, creating affiliate row if needed."""
    affiliate = _ensure_affiliate_row(db, user_id)
    return affiliate.code


def _hash_ip(ip: str) -> str:
    """Hash IP address for privacy."""
    return hashlib.sha256(ip.encode()).hexdigest()[:64]


def _hash_ua(ua: str) -> str:
    """Hash user agent for privacy."""
    return hashlib.sha256(ua.encode()).hexdigest()[:64]


@router.get("/dashboard", response_model=AffiliateDashboard)
def get_affiliate_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AffiliateDashboard:
    """Get the complete affiliate dashboard data."""
    affiliate = _ensure_affiliate_row(db, current_user.id)
    code = affiliate.code
    referral_link = f"https://app.nairatrader.com/ref/{code}"

    # Calculate stats
    # Available balance = total commissions - approved payouts
    total_commissions = db.scalar(
        select(func.sum(AffiliateCommission.amount))
        .where(AffiliateCommission.affiliate_id == current_user.id)
        .where(AffiliateCommission.status == "approved")
    ) or 0.0

    total_payouts = db.scalar(
        select(func.sum(AffiliatePayout.amount))
        .where(AffiliatePayout.affiliate_id == current_user.id)
        .where(AffiliatePayout.status == "approved")
    ) or 0.0

    available_balance = total_commissions - total_payouts

    # Total earned (all approved commissions, excluding manual adjustments)
    total_earned = db.scalar(
        select(func.sum(AffiliateCommission.amount))
        .where(AffiliateCommission.affiliate_id == current_user.id)
        .where(AffiliateCommission.status == "approved")
        .where(AffiliateCommission.unique_customer_key.not_like("manual%"))
    ) or 0.0

    # Unique referrals (distinct customers)
    referrals = db.scalar(
        select(func.count(func.distinct(AffiliateCommission.unique_customer_key)))
        .where(AffiliateCommission.affiliate_id == current_user.id)
        .where(AffiliateCommission.status == "approved")
        .where(AffiliateCommission.unique_customer_key.not_like("manual%"))
    ) or 0

    # Unique impressions (distinct IP hashes)
    impressions = db.scalar(
        select(func.count(func.distinct(AffiliateClick.ip_hash)))
        .where(AffiliateClick.affiliate_id == current_user.id)
    ) or 0

    stats = AffiliateStats(
        available_balance=round(available_balance, 2),
        total_earned=round(total_earned, 2),
        referrals=referrals,
        impressions=impressions,
    )

    # Calculate rewards progress
    rewards = []
    lifetime_referrals = referrals  # Use the count we already calculated

    for i, target in enumerate(MILESTONE_TARGETS):
        amount = REWARD_AMOUNTS[i]

        # Check if this level is claimed
        claimed = db.scalar(
            select(AffiliateMilestone.id)
            .where(AffiliateMilestone.affiliate_id == current_user.id)
            .where(AffiliateMilestone.level == target)
            .where(AffiliateMilestone.status == "approved")
        ) is not None

        if claimed:
            status_str = "claimed"
            progress = target
            remaining = 0
        elif lifetime_referrals >= target:
            status_str = "claimable"
            progress = target
            remaining = 0
        elif i == 0 or lifetime_referrals >= MILESTONE_TARGETS[i-1]:
            # Current active level
            status_str = "live"
            progress = min(lifetime_referrals, target)
            remaining = max(0, target - lifetime_referrals)
        else:
            # Future level
            status_str = "locked"
            progress = 0
            remaining = target

        rewards.append(AffiliateReward(
            amount=amount,
            status=status_str,
            progress=progress if status_str in ["live", "claimable"] else None,
            target=target if status_str in ["live", "claimable"] else None,
            remaining=remaining if status_str == "live" else None,
        ))

    # Recent transactions (last 5)
    transactions = []
    recent_commissions = db.scalars(
        select(AffiliateCommission)
        .where(AffiliateCommission.affiliate_id == current_user.id)
        .where(AffiliateCommission.status == "approved")
        .order_by(desc(AffiliateCommission.created_at))
        .limit(5)
    ).all()

    for comm in recent_commissions:
        transactions.append(AffiliateTransaction(
            date=comm.created_at.strftime("%d/%m/%Y %I:%M %p"),
            type=comm.product_summary or "Commission",
            commission=round(comm.amount, 2),
        ))

    # Recent payouts (last 4)
    payouts = []
    recent_payouts = db.scalars(
        select(AffiliatePayout)
        .where(AffiliatePayout.affiliate_id == current_user.id)
        .order_by(desc(AffiliatePayout.requested_at))
        .limit(4)
    ).all()

    for payout in recent_payouts:
        payouts.append(AffiliatePayoutHistory(
            date=payout.requested_at.strftime("%d/%m/%Y %I:%M %p"),
            status=payout.status.title(),
            amount=round(payout.amount, 2),
        ))

    # Get bank details
    bank_details = None
    bank_account = db.scalar(
        select(UserBankAccount).where(UserBankAccount.user_id == current_user.id)
    )
    if bank_account:
        # Get bank name from the banks data
        from app.data.banks import NIGERIAN_BANKS
        bank_name = "Unknown Bank"
        for bank in NIGERIAN_BANKS:
            if bank["bank_code"] == bank_account.bank_code:
                bank_name = bank["bank_name"]
                break

        bank_details = BankDetails(
            bank_name=bank_name,
            account_name=bank_account.account_name,
            account_number=bank_account.bank_account_number,
        )

    return AffiliateDashboard(
        referral_link=referral_link,
        stats=stats,
        rewards=rewards,
        recent_transactions=transactions,
        recent_payouts=payouts,
        bank_details=bank_details,
    )


@router.post("/payout/request")
def request_payout(
    request: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Request a payout for available balance."""
    # Check minimum payout amount
    min_payout = 3000.0  # ₦3,000 minimum
    if request.amount < min_payout:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum payout amount is ₦{min_payout:,.0f}",
        )

    # Calculate available balance
    total_commissions = db.scalar(
        select(func.sum(AffiliateCommission.amount))
        .where(AffiliateCommission.affiliate_id == current_user.id)
        .where(AffiliateCommission.status == "approved")
    ) or 0.0

    total_payouts = db.scalar(
        select(func.sum(AffiliatePayout.amount))
        .where(AffiliatePayout.affiliate_id == current_user.id)
        .where(AffiliatePayout.status == "approved")
    ) or 0.0

    available_balance = total_commissions - total_payouts

    if request.amount > available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requested amount exceeds available balance",
        )

    # Check for existing pending payout
    pending = db.scalar(
        select(AffiliatePayout.id)
        .where(AffiliatePayout.affiliate_id == current_user.id)
        .where(AffiliatePayout.status == "pending")
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending payout request",
        )

    # Check cooldown (72 hours from last approved payout)
    last_approved = db.scalar(
        select(AffiliatePayout.approved_at)
        .where(AffiliatePayout.affiliate_id == current_user.id)
        .where(AffiliatePayout.status == "approved")
        .order_by(desc(AffiliatePayout.approved_at))
        .limit(1)
    )

    if last_approved:
        cooldown_end = last_approved + timedelta(hours=72)
        if datetime.utcnow() < cooldown_end:
            remaining = cooldown_end - datetime.utcnow()
            hours_left = int(remaining.total_seconds() / 3600)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payout cooldown active. Try again in {hours_left} hours",
            )

    # Create payout request
    payout = AffiliatePayout(
        affiliate_id=current_user.id,
        amount=request.amount,
        status="pending",
        requested_at=datetime.utcnow(),
    )
    db.add(payout)
    db.commit()

    return {"message": "Payout request submitted successfully"}


@router.post("/milestone/claim")
def claim_milestone_reward(
    request: MilestoneClaimRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Claim a milestone reward."""
    if request.level_index < 0 or request.level_index >= len(MILESTONE_TARGETS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid milestone level",
        )

    target = MILESTONE_TARGETS[request.level_index]

    # Check if already claimed
    existing = db.scalar(
        select(AffiliateMilestone.id)
        .where(AffiliateMilestone.affiliate_id == current_user.id)
        .where(AffiliateMilestone.level == target)
        .where(AffiliateMilestone.status == "approved")
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This milestone has already been claimed",
        )

    # Check progress eligibility
    lifetime_referrals = db.scalar(
        select(func.count(func.distinct(AffiliateCommission.unique_customer_key)))
        .where(AffiliateCommission.affiliate_id == current_user.id)
        .where(AffiliateCommission.status == "approved")
        .where(AffiliateCommission.unique_customer_key.not_like("manual%"))
    ) or 0

    if lifetime_referrals < target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You need {target} referrals to claim this reward. You currently have {lifetime_referrals}.",
        )

    # Check for pending request
    pending = db.scalar(
        select(AffiliateMilestone.id)
        .where(AffiliateMilestone.affiliate_id == current_user.id)
        .where(AffiliateMilestone.status == "pending")
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending milestone request",
        )

    # Create milestone request
    milestone = AffiliateMilestone(
        affiliate_id=current_user.id,
        level=target,
        status="pending",
        requested_at=datetime.utcnow(),
    )
    db.add(milestone)
    db.commit()

    return {"message": "Milestone reward request submitted successfully"}


@router.post("/bank-details")
def save_bank_details(
    request: BankDetailsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Save or update bank account details for payouts."""
    # Validate bank code exists
    from app.data.banks import NIGERIAN_BANKS
    valid_bank = False
    for bank in NIGERIAN_BANKS:
        if bank["bank_code"] == request.bank_code:
            valid_bank = True
            break

    if not valid_bank:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bank code",
        )

    # Validate account number (must be 10 digits)
    account_number = "".join(filter(str.isdigit, request.account_number))
    if len(account_number) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account number must be 10 digits",
        )

    # Check if bank account already exists
    existing = db.scalar(
        select(UserBankAccount).where(UserBankAccount.user_id == current_user.id)
    )

    if existing:
        # Update existing
        existing.bank_code = request.bank_code
        existing.account_name = request.account_name.strip()
        existing.bank_account_number = account_number
        db.commit()
    else:
        # Create new
        bank_account = UserBankAccount(
            user_id=current_user.id,
            bank_code=request.bank_code,
            account_name=request.account_name.strip(),
            bank_account_number=account_number,
        )
        db.add(bank_account)
        db.commit()

    return {"message": "Bank details saved successfully"}


@router.post("/click")
def track_affiliate_click(
    affiliate_code: str,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Track an affiliate click (called when someone visits /ref/{code})."""
    # Get affiliate by code
    affiliate = db.scalar(select(Affiliate).where(Affiliate.code == affiliate_code))
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate code not found",
        )

    # Get client IP and User-Agent
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else "")
    ua = request.headers.get("User-Agent", "Unknown")

    ip_hash = _hash_ip(ip)
    ua_hash = _hash_ua(ua)

    # Create click record
    click = AffiliateClick(
        affiliate_id=affiliate.user_id,
        ip_hash=ip_hash,
        ua_hash=ua_hash,
        created_at=datetime.utcnow(),
    )
    db.add(click)
    db.commit()

    return {"message": "Click tracked"}


@router.post("/commission")
def create_commission(
    affiliate_id: int,
    order_id: int,
    customer_user_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    amount: float = 0.0,
    product_summary: Optional[str] = None,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Create a commission record (called when an order is completed)."""
    # Verify affiliate exists
    affiliate = db.scalar(select(Affiliate).where(Affiliate.user_id == affiliate_id))
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate not found",
        )

    # Create unique customer key
    if customer_user_id:
        unique_key = f"u:{customer_user_id}"
    elif customer_email:
        unique_key = f"e:{customer_email.lower().strip()}"
    else:
        unique_key = f"order:{order_id}"

    # Check for duplicate commission for this affiliate+order
    existing = db.scalar(
        select(AffiliateCommission.id)
        .where(AffiliateCommission.affiliate_id == affiliate_id)
        .where(AffiliateCommission.order_id == order_id)
    )
    if existing:
        return {"message": "Commission already exists for this order"}

    order = db.get(PaymentOrder, order_id)
    if order is None or order.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not found or not paid",
        )

    commission_amount = round((order.net_amount_kobo / 100) * 0.10, 2)
    if commission_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order amount is too low for commission",
        )

    # Create commission
    commission = AffiliateCommission(
        affiliate_id=affiliate_id,
        order_id=order_id,
        customer_user_id=customer_user_id,
        customer_email=customer_email,
        unique_customer_key=unique_key,
        amount=commission_amount,
        status="approved",
        product_summary=product_summary,
        created_at=datetime.utcnow(),
    )
    db.add(commission)
    db.commit()

    return {"message": "Commission created successfully"}
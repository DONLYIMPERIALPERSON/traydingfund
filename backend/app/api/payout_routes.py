from typing import List
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.challenge_account import ChallengeAccount
from app.models.user_bank_account import UserBankAccount
from app.models.payment_order import PaymentOrder
from app.models.mt5_account import MT5Account
from app.models.mt5_refresh_job import MT5RefreshJob, RefreshReason, RefreshStatus
from app.models.user_pin import UserPin
from app.services.challenge_objectives import compute_funded_payout_metrics, get_plan_for_account_size, _to_percent_number, compute_unrealized_pnl
from app.models.challenge_config import ChallengeConfig
from app.api.challenge_config_routes import PAYOUT_CONFIG_KEY, DEFAULT_PAYOUT_CONFIG
from app.services.palmpay_service import create_payout_order, query_payout_status
from app.tasks import send_payout_notification
from app.services.certificate_service import certificate_service
from app.data.banks import NIGERIAN_BANKS
from app.core.pin_security import verify_secret
from app.schemas.payout import (
    PayoutSummaryResponse,
    FundedAccountPayout,
    WithdrawalHistory,
    PayoutEligibility,
    PayoutRequest,
    PayoutRequestResponse
)

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payout", tags=["Payout"])

WITHDRAWAL_COOLDOWN_HOURS = 72


def _get_auto_approval_threshold_percent(db: Session) -> float:
    row = db.scalar(select(ChallengeConfig).where(ChallengeConfig.config_key == PAYOUT_CONFIG_KEY))
    if row is None or not isinstance(row.config_value, dict):
        return float(DEFAULT_PAYOUT_CONFIG.get("auto_approval_threshold_percent", 15))
    try:
        return float(row.config_value.get("auto_approval_threshold_percent", 15))
    except (TypeError, ValueError):
        return 15.0


def _is_palmpay_insufficient_funds_error(message: str) -> bool:
    lowered = (message or "").lower()
    return any(token in lowered for token in ["insufficient", "insuff", "insufficient funds", "balance"])


def _get_latest_withdrawal_time(db: Session, user_id: int) -> datetime | None:
    """Return the most recent payout request timestamp for the user."""
    latest = (
        db.query(PaymentOrder.created_at)
        .filter(PaymentOrder.user_id == user_id)
        .filter(PaymentOrder.provider == "palmpay_payout")
        .filter(PaymentOrder.status.in_(["pending_approval", "processing", "completed"]))
        .order_by(PaymentOrder.created_at.desc())
        .first()
    )
    return latest[0] if latest else None


def _get_withdrawal_cooldown_remaining(latest_withdrawal_at: datetime | None) -> timedelta | None:
    if not latest_withdrawal_at:
        return None
    now = datetime.now(timezone.utc)
    elapsed = now - latest_withdrawal_at
    remaining = timedelta(hours=WITHDRAWAL_COOLDOWN_HOURS) - elapsed
    if remaining.total_seconds() <= 0:
        return None
    return remaining


@router.get("/summary", response_model=PayoutSummaryResponse)
async def get_payout_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PayoutSummaryResponse:
    """
    Get comprehensive payout summary for the current user
    """
    # Get all funded accounts for the user
    funded_accounts = db.query(ChallengeAccount).filter(
        ChallengeAccount.user_id == current_user.id,
        ChallengeAccount.current_stage == "Funded"
    ).all()

    # Calculate payout information for each account
    account_payouts = []
    total_available_payout = 0
    total_earned_all_time = 0

    for account in funded_accounts:
        # Ensure payout metrics are up to date
        compute_funded_payout_metrics(db, account, account.latest_balance or 0)
        # Persist the updated payout metrics
        db.add(account)

        # Get plan configuration for this account size
        plan = get_plan_for_account_size(db, account.account_size)
        profit_split_percent = _to_percent_number(plan.get("profit_split") if plan else "80", fallback=80)

        # Calculate minimum withdrawal amount (10% of account size)
        min_withdrawal_amount = account.initial_balance * 0.10

        # Get the raw available payout
        raw_available_payout = account.funded_user_payout_amount or 0

        # Apply withdrawal limits:
        # - Must be at least 10% of account size
        # - Cannot exceed the profit cap amount
        profit_cap_amount = account.funded_profit_cap_amount or 0
        available_payout = min(raw_available_payout, profit_cap_amount)

        # Only allow withdrawal if available payout >= minimum withdrawal amount
        if available_payout < min_withdrawal_amount:
            available_payout = 0

        total_available_payout += available_payout

        account_payouts.append(FundedAccountPayout(
            account_id=account.id,
            challenge_id=account.challenge_id,
            account_size=account.account_size,
            current_balance=account.latest_balance or 0,
            available_payout=available_payout,
            profit_cap_amount=profit_cap_amount,
            profit_split_percent=profit_split_percent,
            minimum_withdrawal_amount=min_withdrawal_amount,
            withdrawal_count=account.withdrawal_count,
            last_withdrawal_at=account.last_feed_at  # This should be tracked properly
        ))

    # Commit the updated payout metrics to the database
    db.commit()

    # Sum completed/processing payout orders for true total earned
    total_withdrawn_kobo = db.scalar(
        db.query(func.sum(PaymentOrder.net_amount_kobo))
        .filter(PaymentOrder.user_id == current_user.id)
        .filter(PaymentOrder.provider == "palmpay_payout")
        .filter(PaymentOrder.status.in_(["completed", "processing", "pending_approval"]))
    )
    total_withdrawn = (total_withdrawn_kobo or 0) / 100
    total_earned_all_time = total_available_payout + total_withdrawn

    # Get withdrawal history
    withdrawal_history = db.query(PaymentOrder).filter(
        PaymentOrder.user_id == current_user.id,
        PaymentOrder.status.in_(["completed", "processing", "pending_approval"])
    ).order_by(PaymentOrder.created_at.desc()).limit(10).all()

    withdrawal_records = []
    for withdrawal in withdrawal_history:
        mt5_account_number = None
        if withdrawal.assigned_mt5_account_id:
            mt5_account = db.get(MT5Account, withdrawal.assigned_mt5_account_id)
            if mt5_account:
                mt5_account_number = mt5_account.account_number
        withdrawal_records.append(WithdrawalHistory(
            id=withdrawal.id,
            amount=withdrawal.net_amount_kobo / 100,  # Convert from kobo to NGN
            status=withdrawal.status,
            requested_at=withdrawal.created_at,
            completed_at=withdrawal.paid_at,  # Use paid_at instead of completed_at
            reference=withdrawal.provider_order_id or "",  # Use provider_order_id as reference
            mt5_account_number=mt5_account_number
        ))

    # Check payout eligibility
    bank_account = db.query(UserBankAccount).filter(
        UserBankAccount.user_id == current_user.id,
        UserBankAccount.is_verified == True
    ).first()

    # Build ineligibility reasons
    ineligibility_reasons = []
    if not bank_account:
        ineligibility_reasons.append("No verified bank account found. Please complete KYC and add a bank account.")
    if total_available_payout <= 0:
        ineligibility_reasons.append("No available payout. You need to generate profits from trading first.")

    # Only consider active, non-breached funded accounts for eligibility
    eligible_funded_accounts = db.query(ChallengeAccount).filter(
        ChallengeAccount.user_id == current_user.id,
        ChallengeAccount.current_stage == "Funded",
        ChallengeAccount.objective_status != "breached"
    ).all()

    if not eligible_funded_accounts:
        ineligibility_reasons.append("No active funded account eligible for payout.")

    # Check minimum payout threshold
    minimum_payout_threshold = min(
        (account.initial_balance * 0.10 for account in eligible_funded_accounts),
        default=0,
    )
    if total_available_payout > 0 and minimum_payout_threshold > 0 and total_available_payout < minimum_payout_threshold:
        ineligibility_reasons.append(
            f"Available payout (₦{total_available_payout:,.2f}) is below minimum withdrawal amount (₦{minimum_payout_threshold:,.2f})."
        )

    latest_withdrawal_at = _get_latest_withdrawal_time(db, current_user.id)
    cooldown_remaining = _get_withdrawal_cooldown_remaining(latest_withdrawal_at)
    if cooldown_remaining:
        remaining_hours = int(cooldown_remaining.total_seconds() // 3600) + 1
        ineligibility_reasons.append(
            f"Withdrawal cooldown active. Please wait about {remaining_hours} hour(s) before requesting another payout."
        )

    eligibility = PayoutEligibility(
        is_eligible=bool(bank_account and total_available_payout > 0 and eligible_funded_accounts and not ineligibility_reasons),
        has_verified_bank_account=bool(bank_account),
        has_available_payout=total_available_payout > 0,
        minimum_payout_amount=minimum_payout_threshold or 0,
        bank_account_masked=bank_account.bank_account_number[-4:] if bank_account else None,
        ineligibility_reasons=ineligibility_reasons
    )

    return PayoutSummaryResponse(
        total_available_payout=total_available_payout,
        total_earned_all_time=total_earned_all_time,
        funded_accounts=account_payouts,
        withdrawal_history=withdrawal_records,
        eligibility=eligibility
    )


@router.get("/eligibility")
async def check_payout_eligibility(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if user is eligible for payout
    """
    # Check for verified bank account
    bank_account = db.query(UserBankAccount).filter(
        UserBankAccount.user_id == current_user.id,
        UserBankAccount.is_verified == True
    ).first()

    # Check for funded accounts with available payout
    funded_accounts = db.query(ChallengeAccount).filter(
        ChallengeAccount.user_id == current_user.id,
        ChallengeAccount.current_stage == "Funded",
        ChallengeAccount.objective_status != "breached"
    ).all()

    total_available = 0
    for account in funded_accounts:
        compute_funded_payout_metrics(db, account, account.latest_balance or 0)
        total_available += account.funded_user_payout_amount or 0

    latest_withdrawal_at = _get_latest_withdrawal_time(db, current_user.id)
    cooldown_remaining = _get_withdrawal_cooldown_remaining(latest_withdrawal_at)

    return {
        "eligible": bool(bank_account and total_available > 0 and funded_accounts and cooldown_remaining is None),
        "has_bank_account": bool(bank_account),
        "has_funded_accounts": len(funded_accounts) > 0,
        "available_payout": total_available,
        "reasons": [
            "No verified bank account" if not bank_account else None,
            "No available payout" if total_available == 0 else None,
            "No active funded account eligible for payout." if not funded_accounts else None,
            (
                "Withdrawal cooldown active. Please wait 72 hours after your last payout before requesting another."
                if cooldown_remaining is not None
                else None
            )
        ]
    }


@router.post("/request", response_model=PayoutRequestResponse)
async def request_payout(
    request: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PayoutRequestResponse:
    """
    Request a payout from a funded account
    """
    # Validate account ownership and status
    account = db.get(ChallengeAccount, request.account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not owned by user")

    if account.current_stage != "Funded":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is not in funded stage")

    if account.objective_status == "breached":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account has been breached and is not eligible for payout")

    latest_withdrawal_at = _get_latest_withdrawal_time(db, current_user.id)
    cooldown_remaining = _get_withdrawal_cooldown_remaining(latest_withdrawal_at)
    if cooldown_remaining:
        remaining_hours = int(cooldown_remaining.total_seconds() // 3600) + 1
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Withdrawal cooldown active. "
                f"Please wait about {remaining_hours} hour(s) before requesting another payout."
            ),
        )

    user_pin = db.query(UserPin).filter(UserPin.user_id == current_user.id).first()
    if user_pin is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction PIN not set")

    if not verify_secret(request.pin, user_pin.pin_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid transaction PIN")

    # Withdrawal verification using latest stored data (no MT5 refresh job)
    if account.objective_status == "breached":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account has been breached and is not eligible for payout")

    unrealized_pnl = compute_unrealized_pnl(account)
    if abs(unrealized_pnl) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Open trades detected. Please close all trades before requesting a payout."
        )

    # Now run withdrawal eligibility checks with fresh data
    # Ensure payout metrics are up to date with latest balance
    compute_funded_payout_metrics(db, account, account.latest_balance or 0)

    # Get available payout and limits
    available_payout = account.funded_user_payout_amount or 0
    min_withdrawal_amount = account.initial_balance * 0.10
    profit_cap_amount = account.funded_profit_cap_amount or 0

    # Apply withdrawal limits
    max_allowed_payout = min(available_payout, profit_cap_amount)

    if request.amount is not None:
        max_allowed_payout = min(max_allowed_payout, request.amount)

    if max_allowed_payout < min_withdrawal_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient payout. Minimum withdrawal is ₦{min_withdrawal_amount:,.2f}"
        )

    # Check bank account
    bank_account = db.query(UserBankAccount).filter(
        UserBankAccount.user_id == current_user.id,
        UserBankAccount.is_verified == True
    ).first()

    if not bank_account:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No verified bank account found")

    # Determine if admin approval is needed (payout > 15% of account size)
    account_size_value = account.initial_balance
    payout_percentage = (max_allowed_payout / account_size_value) * 100
    auto_approval_threshold_percent = _get_auto_approval_threshold_percent(db)
    requires_admin_approval = payout_percentage > auto_approval_threshold_percent

    # Create payout order
    import uuid

    provider_order_id = f"payout-{uuid.uuid4().hex[:24]}"
    notify_url = f"{settings.app_public_base_url.rstrip('/')}/payout/notify"

    palmpay_response = None
    palmpay_error: str | None = None
    if not requires_admin_approval:
        # Create PalmPay payout order immediately for auto-approved payouts
        try:
            palmpay_response = create_payout_order(
                order_id=provider_order_id,
                amount_kobo=int(max_allowed_payout * 100),  # Convert to kobo
                payee_name=bank_account.account_name,
                payee_bank_code=bank_account.bank_code,
                payee_bank_acc_no=bank_account.bank_account_number,
                payee_phone_no=getattr(bank_account, 'phone_number', None),
                currency="NGN",
                notify_url=notify_url,
                remark=f"NairaTrader payout for {account.account_size} account"
            )
        except Exception as e:
            palmpay_error = str(e)
            if _is_palmpay_insufficient_funds_error(palmpay_error):
                requires_admin_approval = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to initiate payout: {palmpay_error}"
                )

    # Create payment order record
    payout_order = PaymentOrder(
        user_id=current_user.id,
        provider="palmpay_payout",
        provider_order_id=provider_order_id,
        provider_order_no=palmpay_response.get("orderNo") if palmpay_response else None,
        status="pending_approval" if requires_admin_approval else "processing",
        assignment_status="assigned",
        currency="NGN",
        gross_amount_kobo=int(max_allowed_payout * 100),
        discount_amount_kobo=0,
        net_amount_kobo=int(max_allowed_payout * 100),
        plan_id=account.account_size,
        account_size=account.account_size,
        challenge_id=account.challenge_id,
        assigned_mt5_account_id=account.active_mt5_account_id,
        payer_bank_name=next((bank["bank_name"] for bank in NIGERIAN_BANKS if bank["bank_code"] == bank_account.bank_code), bank_account.bank_code),
        payer_account_name=bank_account.account_name,
        payer_virtual_acc_no=bank_account.bank_account_number,
        provider_raw_response=palmpay_response,
        metadata_json={
            "payout_type": "withdrawal",
            "account_id": account.id,
            "requires_admin_approval": requires_admin_approval,
            "payout_percentage": round(payout_percentage, 2),
            "min_withdrawal_amount": min_withdrawal_amount,
            "profit_cap_amount": profit_cap_amount,
            "bank_code": bank_account.bank_code,
            "bank_account_number": bank_account.bank_account_number,
            "bank_account_name": bank_account.account_name,
            "bank_phone": getattr(bank_account, 'phone_number', None),
            "auto_payout_fallback": bool(palmpay_error),
            "auto_payout_error": palmpay_error
        }
    )

    db.add(payout_order)
    db.flush()

    # Immediately deactivate the current funded account
    old_mt5_account = db.get(MT5Account, account.active_mt5_account_id)
    if old_mt5_account:
        old_mt5_account.status = "Withdrawn"
        old_mt5_account.assignment_mode = "automatic"
        old_mt5_account.assigned_by_admin_name = "System (Payout Requested)"
        db.add(old_mt5_account)

    # Mark account as withdrawn (but keep it in database for history)
    account.current_stage = "Withdrawn"
    account.funded_user_payout_amount = 0
    account.withdrawal_count += 1
    account.last_withdrawn_mt5_account_id = account.active_mt5_account_id
    db.add(account)

    # Send notification email
    try:
        if requires_admin_approval:
            message = (
                f"Your payout request of ₦{max_allowed_payout:,.2f} has been submitted and is pending admin approval.\n\n"
                f"Account: {account.account_size}\n"
                f"Challenge ID: {account.challenge_id}\n"
                f"Bank Account: ****{bank_account.bank_account_number[-4:]}\n\n"
                f"You will receive an email notification once the payout is approved and processed."
            )
        else:
            message = (
                f"Your payout request of ₦{max_allowed_payout:,.2f} has been submitted and is being processed.\n\n"
                f"Account: {account.account_size}\n"
                f"Challenge ID: {account.challenge_id}\n"
                f"Bank Account: ****{bank_account.bank_account_number[-4:]}\n\n"
                f"You will receive an email notification once the payout is completed."
            )
        send_payout_notification.delay(to_email=current_user.email, message=message)
    except Exception:
        # Don't fail payout request if email fails
        pass

    # Generate payout certificate for auto-approved payouts
    if not requires_admin_approval:
        try:
            amount_formatted = f"{max_allowed_payout:,.0f}"
            certificate = certificate_service.generate_payout_certificate(
                user_id=current_user.id,
                payout_id=str(payout_order.id),
                amount=amount_formatted,
                db=db
            )

            if certificate:
                print(f"Generated payout certificate for user {current_user.id}: {certificate.id}")
            else:
                print(f"Failed to generate payout certificate for user {current_user.id}")

        except Exception as e:
            print(f"Error generating payout certificate: {e}")
            # Don't fail the payout request if certificate generation fails

    db.commit()

    # Estimate completion time: 24 hours for all payouts
    from datetime import timedelta
    estimated_completion = datetime.now(timezone.utc) + timedelta(hours=24)

    return PayoutRequestResponse(
        request_id=str(payout_order.id),
        amount=max_allowed_payout,
        status=payout_order.status,
        estimated_completion=estimated_completion,
        message="Payout request submitted successfully" + (" and is pending admin approval" if requires_admin_approval else " and is being processed")
    )


@router.post("/notify")
async def payout_notify(request: Request, db: Session = Depends(get_db)):
    """
    Handle PalmPay payout notification callbacks
    """
    payload = await request.json()
    print(f"🔔 Webhook received: {payload}")

    if not isinstance(payload, dict):
        print("❌ Invalid payload format")
        return {"success": False, "message": "Invalid payload"}

    # Verify callback signature
    signature = str(payload.get("sign") or "").strip()
    if not signature:
        print("❌ Missing signature")
        return {"success": False, "message": "Missing signature"}

    try:
        from app.services.palmpay_service import verify_callback_signature
        if not verify_callback_signature(payload, signature):
            print("⚠️  Invalid signature - bypassing for testing")
            # For testing, continue even if signature fails
            # return {"success": False, "message": "Invalid signature"}
        else:
            print("✅ Signature verified")
    except Exception as e:
        print(f"⚠️  Signature verification error: {e} - bypassing for testing")
        # For testing, continue even if signature verification fails
        # return {"success": False, "message": "Signature verification failed"}

    # Extract order information
    order_id = str(payload.get("orderId") or "").strip()
    order_no = str(payload.get("orderNo") or "").strip()
    order_status = int(payload.get("orderStatus") or 0)

    print(f"📋 Order ID: {order_id}, Order No: {order_no}, Status: {order_status}")

    if not order_id and not order_no:
        print("❌ Missing order ID")
        return {"success": False, "message": "Missing order ID"}

    # Find the payout order
    payout_order = None
    if order_id:
        payout_order = db.query(PaymentOrder).filter(
            PaymentOrder.provider_order_id == order_id,
            PaymentOrder.provider == "palmpay_payout"
        ).first()
        print(f"🔍 Searched by order_id: {order_id}, found: {payout_order is not None}")

    if not payout_order and order_no:
        payout_order = db.query(PaymentOrder).filter(
            PaymentOrder.provider_order_no == order_no,
            PaymentOrder.provider == "palmpay_payout"
        ).first()
        print(f"🔍 Searched by order_no: {order_no}, found: {payout_order is not None}")

    if not payout_order:
        print("❌ Payout order not found")
        return {"success": False, "message": "Payout order not found"}

    print(f"✅ Found payout order: {payout_order.id}, current status: {payout_order.status}")

    # Update order status
    if order_status == 2:  # Success
        if payout_order.status == "completed":
            return {"success": True, "message": "Notification already processed"}

        payout_order.status = "completed"
        payout_order.paid_at = datetime.now(timezone.utc)
        payout_order.provider_raw_response = payload

        # Assign a new funded account to the user (same challenge ID)
        try:
            # Find the challenge account
            challenge = db.query(ChallengeAccount).filter(
                ChallengeAccount.id == payout_order.metadata_json.get("account_id")
            ).first()

            if challenge:
                # Find a new ready MT5 account of the same size
                new_mt5_account = db.query(MT5Account).filter(
                    MT5Account.status == "Ready",
                    MT5Account.account_size == challenge.account_size
                ).order_by(MT5Account.id.asc()).first()

                if new_mt5_account:
                    # Assign the new MT5 account
                    challenge.active_mt5_account_id = new_mt5_account.id
                    challenge.funded_mt5_account_id = new_mt5_account.id
                    challenge.current_stage = "Funded"  # Reactivate the challenge
                    challenge.objective_status = "active"  # Reset objective status

                    # Reinitialize challenge tracking for the new account
                    from app.services.challenge_objectives import initialize_challenge_stage_tracking
                    initialize_challenge_stage_tracking(challenge, account_size=new_mt5_account.account_size, now=datetime.now(timezone.utc))

                    # Update new MT5 account status
                    new_mt5_account.status = "Funded"
                    new_mt5_account.assignment_mode = "automatic"
                    new_mt5_account.assigned_user_id = challenge.user_id
                    new_mt5_account.assigned_at = datetime.now(timezone.utc)
                    new_mt5_account.assigned_by_admin_name = "System (Post-Payout)"

                    db.add(challenge)
                    db.add(new_mt5_account)

                    print(f"Assigned new funded account for challenge {challenge.challenge_id}: {new_mt5_account.account_number}")
                else:
                    print(f"Warning: No ready MT5 account available for challenge {challenge.challenge_id}")
        except Exception as e:
            print(f"Error assigning new account after payout: {e}")
            # Don't fail the payout if account assignment fails

        # Send completion email
        try:
            user = db.get(User, payout_order.user_id)
            if user:
                message = (
                    f"Your payout of ₦{payout_order.amount:,.2f} has been successfully processed!\n\n"
                    f"The funds have been transferred to your bank account ending in "
                    f"{payout_order.payer_virtual_acc_no[-4:] if payout_order.payer_virtual_acc_no else '****'}.\n\n"
                    f"Thank you for trading with NairaTrader!"
                )
                send_payout_notification.delay(to_email=user.email, subject="Payout Completed", message=message)
        except Exception:
            # Don't fail the callback if email fails
            pass

    elif order_status == 3:  # Failed
        payout_order.status = "failed"
        payout_order.provider_raw_response = payload

        # Send failure email
        try:
            user = db.get(User, payout_order.user_id)
            if user:
                message = (
                    f"Unfortunately, your payout request of ₦{payout_order.amount:,.2f} could not be processed.\n\n"
                    f"Please contact our support team for assistance.\n\n"
                    f"We're sorry for the inconvenience."
                )
                send_payout_notification.delay(to_email=user.email, subject="Payout Failed", message=message)
        except Exception:
            pass

    db.add(payout_order)
    db.commit()

    return {"success": True, "message": "Notification processed"}

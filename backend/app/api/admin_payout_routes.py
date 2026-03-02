from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.core.config import settings
from app.db.deps import get_db
from app.models.admin_allowlist import AdminAllowlist
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.services.palmpay_service import create_payout_order, query_payout_status
from app.tasks import send_payout_notification
from app.services.certificate_service import certificate_service
from app.api.admin_workboard_routes import log_admin_activity
router = APIRouter(prefix="/admin/payouts", tags=["Admin Payouts"])


@router.get("/stats")
def get_payout_stats(
    period: Literal["today", "week", "month"] = Query("today", description="Time period for stats"),
    current_admin: AdminAllowlist = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    now = datetime.now(timezone.utc)

    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    else:  # month
        start_date = now - timedelta(days=30)

    # Base query for payout orders in the period
    period_query = select(PaymentOrder).where(
        PaymentOrder.created_at >= start_date,
        PaymentOrder.provider == "palmpay_payout"
    )

    # Pending review (pending_approval status)
    pending_review = db.scalar(
        select(func.count(PaymentOrder.id)).where(
            PaymentOrder.created_at >= start_date,
            PaymentOrder.provider == "palmpay_payout",
            PaymentOrder.status == "pending_approval"
        )
    ) or 0

    # Approved today (processing or completed status)
    approved_today = db.scalar(
        select(func.count(PaymentOrder.id)).where(
            PaymentOrder.created_at >= start_date,
            PaymentOrder.provider == "palmpay_payout",
            PaymentOrder.status.in_(["processing", "completed"])
        )
    ) or 0

    # Paid today (completed status)
    paid_today_kobo = db.scalar(
        select(func.sum(PaymentOrder.net_amount_kobo)).where(
            PaymentOrder.created_at >= start_date,
            PaymentOrder.provider == "palmpay_payout",
            PaymentOrder.status == "completed"
        )
    ) or 0

    # Rejected (failed status)
    rejected = db.scalar(
        select(func.count(PaymentOrder.id)).where(
            PaymentOrder.created_at >= start_date,
            PaymentOrder.provider == "palmpay_payout",
            PaymentOrder.status == "failed"
        )
    ) or 0

    return {
        "period": period,
        "pending_review": pending_review,
        "approved_today": approved_today,
        "paid_today_kobo": paid_today_kobo,
        "paid_today_formatted": f"₦{(paid_today_kobo / 100):,.0f}",
        "rejected": rejected,
    }


@router.get("")
def get_payout_requests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    period: Literal["today", "week", "month", "all"] = Query("today", description="Time period filter"),
    status_filter: str | None = Query(None, description="Filter by status"),
    search: str | None = Query(None, description="Search by order ID, user name, or email"),
    current_admin: AdminAllowlist = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    # Calculate start date based on period
    now = datetime.now(timezone.utc)
    start_date = None
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)

    # Base query with period filter - get account info from metadata_json
    query = select(
        PaymentOrder,
        User.full_name,
        User.email,
    ).join(User, PaymentOrder.user_id == User.id).where(
        PaymentOrder.provider == "palmpay_payout"
    )
    if start_date:
        query = query.where(PaymentOrder.created_at >= start_date)

    # Apply filters
    if status_filter:
        query = query.where(PaymentOrder.status == status_filter)

    if search:
        search_term = f"%{search}%"
        user_id_filter = None
        if search.isdigit():
            user_id_filter = int(search)
        query = query.where(
            PaymentOrder.provider_order_id.ilike(search_term) |
            User.full_name.ilike(search_term) |
            User.email.ilike(search_term) |
            (PaymentOrder.user_id == user_id_filter if user_id_filter is not None else False)
        )

    # Get total count
    total_count = db.scalar(
        select(func.count()).select_from(query.subquery())
    ) or 0

    # Apply pagination and ordering
    query = query.order_by(PaymentOrder.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    # Execute query
    results = db.execute(query).all()

    # Format results
    payouts = []
    for payment_order, user_name, user_email in results:
        # Get account info from metadata_json
        metadata = payment_order.metadata_json or {}
        mt5_account_number = metadata.get("mt5_account_number")
        if not mt5_account_number and payment_order.assigned_mt5_account_id:
            account = db.get(ChallengeAccount, payment_order.metadata_json.get("account_id")) if payment_order.metadata_json else None
            if account and account.active_mt5_account_id:
                mt5_account = db.get(MT5Account, account.active_mt5_account_id)
                if mt5_account:
                    mt5_account_number = mt5_account.account_number
        if mt5_account_number:
            metadata["mt5_account_number"] = mt5_account_number

        account_info = {
            "challenge_id": metadata.get("challenge_id", payment_order.challenge_id or "Unknown"),
            "account_size": metadata.get("account_size", payment_order.account_size or "Unknown"),
        }

        payouts.append({
            "id": payment_order.id,
            "provider_order_id": payment_order.provider_order_id,
            "status": payment_order.status,
            "amount_kobo": payment_order.net_amount_kobo,
            "amount_formatted": f"₦{(payment_order.net_amount_kobo / 100):,.0f}",
            "created_at": payment_order.created_at.isoformat() if payment_order.created_at else None,
            "completed_at": payment_order.paid_at.isoformat() if payment_order.paid_at else None,
            "user": {
                "id": payment_order.user_id,
                "name": user_name or "Unknown",
                "email": user_email,
            },
            "account": account_info,
            "metadata": metadata,
        })

    return {
        "payouts": payouts,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit,
        },
    }


@router.post("/{payout_id}/approve")
def approve_payout(
    payout_id: int,
    current_admin: AdminAllowlist = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    # Get the payout order
    payout_order = db.get(PaymentOrder, payout_id)
    if not payout_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout request not found")

    if payout_order.provider != "palmpay_payout":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a payout order")

    if payout_order.status != "pending_approval":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payout is not pending approval")

    payout_order.metadata_json = payout_order.metadata_json or {}
    payout_order.metadata_json["approved_by"] = current_admin.full_name or current_admin.email
    payout_order.metadata_json["approved_at"] = datetime.now(timezone.utc).isoformat()

    if not payout_order.provider_order_no:
        # Trigger PalmPay payout only after admin approval
        payee_name = payout_order.metadata_json.get("bank_account_name") or payout_order.payer_account_name
        payee_bank_code = payout_order.metadata_json.get("bank_code")
        payee_bank_acc_no = payout_order.metadata_json.get("bank_account_number") or payout_order.payer_virtual_acc_no
        payee_phone_no = payout_order.metadata_json.get("bank_phone")

        if not payee_bank_code or not payee_bank_acc_no or not payee_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing payout bank details for approval."
            )

        notify_url = f"{payout_order.provider_raw_response.get('notifyUrl')}" if isinstance(payout_order.provider_raw_response, dict) else None
        if not notify_url:
            notify_url = f"{settings.app_public_base_url.rstrip('/')}/payout/notify"

        try:
            palmpay_response = create_payout_order(
                order_id=payout_order.provider_order_id,
                amount_kobo=int(payout_order.net_amount_kobo),
                payee_name=payee_name,
                payee_bank_code=payee_bank_code,
                payee_bank_acc_no=payee_bank_acc_no,
                payee_phone_no=payee_phone_no,
                currency=payout_order.currency or "NGN",
                notify_url=notify_url,
                remark=f"NairaTrader payout for {payout_order.account_size} account"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to initiate payout: {str(e)}"
            )

        payout_order.provider_order_no = palmpay_response.get("orderNo")
        payout_order.provider_raw_response = palmpay_response

    # Update status to processing after payout is created
    payout_order.status = "processing"

    db.add(payout_order)
    db.commit()

    user = db.get(User, payout_order.user_id)
    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="approve_payout",
        description=f"Approved payout of ₦{(payout_order.net_amount_kobo / 100):,.0f} for user {user.email if user else payout_order.user_id}",
        entity_type="payout",
        entity_id=payout_order.id
    )
    # Generate payout certificate
    try:
        # Get account size from the challenge account
        account = db.query(ChallengeAccount).filter(
            ChallengeAccount.active_mt5_account_id == payout_order.assigned_mt5_account_id
        ).first()

        account_size = account.account_size if account else payout_order.account_size or "Unknown"
        amount_formatted = f"{(payout_order.net_amount_kobo / 100):,.0f}"

        certificate = certificate_service.generate_payout_certificate(
            user_id=payout_order.user_id,
            payout_id=str(payout_order.id),
            amount=amount_formatted,
            db=db
        )

        if certificate:
            print(f"Generated payout certificate for user {payout_order.user_id}: {certificate.id}")
        else:
            print(f"Failed to generate payout certificate for user {payout_order.user_id}")

    except Exception as e:
        print(f"Error generating payout certificate: {e}")
        # Don't fail the payout approval if certificate generation fails

    # Send notification email to user
    try:
        if user:
            message = (
                f"Your payout request of ₦{(payout_order.net_amount_kobo / 100):,.2f} has been approved and is now being processed.\n\n"
                f"Account: {payout_order.account_size}\n"
                f"Challenge ID: {payout_order.challenge_id}\n"
                f"Bank Account: ****{payout_order.payer_virtual_acc_no[-4:] if payout_order.payer_virtual_acc_no else '****'}\n\n"
                f"You will receive an email notification once the payout is completed."
            )
            send_payout_notification.delay(to_email=user.email, subject="Payout Approved - Processing", message=message)
    except Exception:
        # Don't fail approval if email fails
        pass

    return {"success": True, "message": "Payout approved and processing"}


@router.post("/{payout_id}/reject")
def reject_payout(
    payout_id: int,
    reason: str = Query(..., description="Reason for rejection"),
    current_admin: AdminAllowlist = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    # Get the payout order
    payout_order = db.get(PaymentOrder, payout_id)
    if not payout_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout request not found")

    if payout_order.provider != "palmpay_payout":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a payout order")

    if payout_order.status != "pending_approval":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payout is not pending approval")

    # Update status to failed
    payout_order.status = "failed"
    payout_order.metadata_json = payout_order.metadata_json or {}
    payout_order.metadata_json["rejected_by"] = current_admin.full_name or current_admin.email
    payout_order.metadata_json["rejected_at"] = datetime.now(timezone.utc).isoformat()
    payout_order.metadata_json["rejection_reason"] = reason

    # Restore the account back to funded status
    if payout_order.metadata_json.get("account_id"):
        account = db.get(ChallengeAccount, payout_order.metadata_json["account_id"])
        if account:
            # Restore the payout amount
            account.funded_user_payout_amount = (account.funded_user_payout_amount or 0) + (payout_order.net_amount_kobo / 100)
            account.withdrawal_count -= 1  # Decrement withdrawal count

            # Reactivate the account
            account.current_stage = "Funded"
            account.objective_status = "active"

            # Reinitialize challenge tracking
            from app.services.challenge_objectives import initialize_challenge_stage_tracking
            initialize_challenge_stage_tracking(account, account_size=account.account_size, now=datetime.now(timezone.utc))

            db.add(account)

    db.add(payout_order)
    db.commit()

    user = db.get(User, payout_order.user_id)

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="reject_payout",
        description=(
            f"Rejected payout of ₦{(payout_order.net_amount_kobo / 100):,.0f} for user "
            f"{user.email if user else payout_order.user_id} with reason: {reason}"
        ),
        entity_type="payout",
        entity_id=payout_order.id
    )
    # Send notification email to user
    try:
        if user:
            message = (
                f"Unfortunately, your payout request of ₦{(payout_order.net_amount_kobo / 100):,.2f} has been declined.\n\n"
                f"Reason: {reason}\n\n"
                f"Account: {payout_order.account_size}\n"
                f"Challenge ID: {payout_order.challenge_id}\n\n"
                f"The funds have been restored to your account. You can try again or contact support if you have questions."
            )
            send_payout_notification.delay(to_email=user.email, subject="Payout Declined", message=message)
    except Exception:
        # Don't fail rejection if email fails
        pass

    return {"success": True, "message": "Payout rejected"}


@router.get("/{payout_id}/status")
def check_payout_status(
    payout_id: int,
    current_admin: AdminAllowlist = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    # Get the payout order
    payout_order = db.get(PaymentOrder, payout_id)
    if not payout_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout request not found")

    if payout_order.provider != "palmpay_payout":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a payout order")

    # If it's processing, check with PalmPay
    if payout_order.status == "processing" and payout_order.provider_order_no:
        try:
            palmpay_status = query_payout_status(order_no=payout_order.provider_order_no)
            order_status = palmpay_status.get("orderStatus")

            # Update local status based on PalmPay response
            if order_status == 2:  # Success
                payout_order.status = "completed"
                payout_order.paid_at = datetime.now(timezone.utc)
                payout_order.provider_raw_response = palmpay_status
                db.add(payout_order)
                db.commit()
            elif order_status == 3:  # Failed
                payout_order.status = "failed"
                payout_order.provider_raw_response = palmpay_status
                db.add(payout_order)
                db.commit()

        except Exception as e:
            # If PalmPay check fails, return current status
            pass

    return {
        "id": payout_order.id,
        "status": payout_order.status,
        "provider_order_id": payout_order.provider_order_id,
        "provider_order_no": payout_order.provider_order_no,
        "amount_formatted": f"₦{(payout_order.net_amount_kobo / 100):,.0f}",
        "created_at": payout_order.created_at.isoformat() if payout_order.created_at else None,
        "completed_at": payout_order.paid_at.isoformat() if payout_order.paid_at else None,
        "metadata": payout_order.metadata_json or {},
    }


@router.post("/generate-payout-certificates", status_code=200)
def generate_missing_payout_certificates(
    current_admin: AdminAllowlist = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Admin endpoint to generate payout certificates for completed payouts that don't have them"""
    # Find all completed payout orders
    completed_payouts = db.scalars(
        select(PaymentOrder).where(
            PaymentOrder.provider == "palmpay_payout",
            PaymentOrder.status == "completed"
        )
    ).all()

    generated_count = 0
    failed_count = 0

    for payout in completed_payouts:
        # Check if payout certificate already exists
        existing_certificates = certificate_service.get_user_certificates(payout.user_id, db)
        has_payout_certificate = any(
            cert.certificate_type == "payout" and cert.related_entity_id == str(payout.id)
            for cert in existing_certificates
        )

        if has_payout_certificate:
            continue  # Already has certificate

        # Generate payout certificate
        try:
            amount_formatted = f"{(payout.net_amount_kobo / 100):,.0f}"
            certificate = certificate_service.generate_payout_certificate(
                user_id=payout.user_id,
                payout_id=str(payout.id),
                amount=amount_formatted,
                db=db
            )
            if certificate:
                generated_count += 1
                print(f"Generated missing payout certificate for user {payout.user_id}, payout {payout.id}")
            else:
                failed_count += 1
                print(f"Failed to generate payout certificate for user {payout.user_id}, payout {payout.id}")
        except Exception as e:
            failed_count += 1
            print(f"Error generating payout certificate for user {payout.user_id}: {e}")

    return {
        "message": f"Generated {generated_count} payout certificates, {failed_count} failed",
        "generated": generated_count,
        "failed": failed_count
    }

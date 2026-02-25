from datetime import datetime, timezone
import json
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.coupon_routes import resolve_coupon_amount_for_plan
from app.core.auth import get_current_user
from app.core.config import settings
from app.db.deps import get_db
from app.models.challenge_account import ChallengeAccount
from app.models.challenge_config import ChallengeConfig
from app.models.mt5_account import MT5Account
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.schemas.payment import PaymentInitRequest, PaymentOrderResponse, PaymentStatusRefreshResponse
from app.services.challenge_objectives import initialize_challenge_stage_tracking
from app.services.email_service import send_welcome_email
from app.services.palmpay_service import (
    PalmPayPaymentError,
    create_bank_transfer_order,
    map_order_status,
    query_order_status,
    verify_callback_signature,
)


router = APIRouter(tags=["Payments"])

CHALLENGE_CONFIG_KEY = "public_challenge_plans"


def _parse_naira_to_kobo(value: str) -> int:
    cleaned = re.sub(r"[^0-9.]", "", value or "")
    if not cleaned:
        return 0
    return int(round(float(cleaned) * 100))


def _get_plan_by_id(db: Session, plan_id: str) -> dict[str, object] | None:
    row = db.scalar(select(ChallengeConfig).where(ChallengeConfig.config_key == CHALLENGE_CONFIG_KEY))
    if row is None or not isinstance(row.config_value, list):
        return None

    for item in row.config_value:
        if not isinstance(item, dict):
            continue
        if str(item.get("id") or "").strip() == plan_id:
            return item
    return None


def _serialize_payment_order(order: PaymentOrder) -> PaymentOrderResponse:
    return PaymentOrderResponse(
        provider_order_id=order.provider_order_id,
        status=order.status,
        assignment_status=order.assignment_status,
        currency=order.currency,
        gross_amount_kobo=order.gross_amount_kobo,
        discount_amount_kobo=order.discount_amount_kobo,
        net_amount_kobo=order.net_amount_kobo,
        plan_id=order.plan_id,
        account_size=order.account_size,
        coupon_code=order.coupon_code,
        checkout_url=order.checkout_url,
        payer_bank_name=order.payer_bank_name,
        payer_account_name=order.payer_account_name,
        payer_virtual_acc_no=order.payer_virtual_acc_no,
        expires_at=order.expires_at,
        challenge_id=order.challenge_id,
    )


def _next_challenge_id(db: Session, prefix: str = "CH") -> str:
    latest = db.scalar(select(ChallengeAccount.id).order_by(ChallengeAccount.id.desc()))
    next_seq = (latest + 1) if latest else 1
    return f"{prefix}-{next_seq:05d}"


def _assign_phase1_account_for_paid_order(db: Session, order: PaymentOrder) -> str:
    if order.assignment_status == "assigned" and order.challenge_id:
        return order.challenge_id

    mt5 = db.scalar(
        select(MT5Account)
        .where(MT5Account.status == "Ready", MT5Account.account_size == order.account_size)
        .order_by(MT5Account.id.asc())
    )
    if mt5 is None:
        order.assignment_status = "awaiting_account"
        db.add(order)

        # Send waiting email
        user = db.get(User, order.user_id)
        if user:
            try:
                message = (
                    f"Congratulations! Your payment of ₦{order.net_amount_kobo / 100:,.2f} has been confirmed.\n\n"
                    f"We are currently preparing your MT5 trading account. "
                    f"You will receive an email notification as soon as your account is ready and assigned.\n\n"
                    f"Thank you for your patience!"
                )
                send_welcome_email.delay(to_email=user.email, message=message)
            except Exception:
                # Don't fail the payment process if email fails
                pass

        return ""

    challenge_id = _next_challenge_id(db, prefix="CH")
    challenge = ChallengeAccount(
        challenge_id=challenge_id,
        user_id=order.user_id,
        account_size=mt5.account_size,
        current_stage="Phase 1",
        phase1_mt5_account_id=mt5.id,
        phase2_mt5_account_id=None,
        funded_mt5_account_id=None,
        active_mt5_account_id=mt5.id,
    )
    initialize_challenge_stage_tracking(challenge, account_size=mt5.account_size)
    db.add(challenge)
    db.flush()

    mt5.status = "Phase 1"
    mt5.assignment_mode = "automatic"
    mt5.assigned_user_id = order.user_id
    mt5.assigned_by_admin_name = "Auto"
    mt5.assigned_at = datetime.now(timezone.utc)
    db.add(mt5)

    order.challenge_id = challenge_id
    order.assigned_mt5_account_id = mt5.id
    order.assignment_status = "assigned"
    db.add(order)

    # Increment coupon usage count if coupon was used
    if order.coupon_code:
        from app.models.coupon import Coupon
        from sqlalchemy import func
        coupon = db.scalar(select(Coupon).where(Coupon.code == order.coupon_code))
        if coupon:
            coupon.used_count += 1
            # Deactivate coupon if it has reached max uses or expired
            now = datetime.now(timezone.utc)
            if (coupon.max_uses is not None and coupon.used_count >= coupon.max_uses) or \
               (coupon.expires_at and coupon.expires_at <= now):
                coupon.is_active = False
            db.add(coupon)

    # Send welcome email to user
    user = db.get(User, order.user_id)
    if user:
        try:
            message = (
                f"Congratulations! Your payment of ₦{order.net_amount_kobo / 100:,.2f} has been confirmed "
                f"and your {order.account_size} challenge account ({challenge_id}) has been assigned.\n\n"
                f"Your MT5 trading account details:\n"
                f"• Account Number: {mt5.account_number}\n"
                f"• Server: {mt5.server}\n"
                f"• Password: {mt5.password}\n\n"
                f"You can now log in to your MT5 platform and start trading. "
                f"Good luck with your challenge!"
            )
            send_welcome_email.delay(to_email=user.email, message=message)
        except Exception:
            # Don't fail the payment process if email fails
            pass

    return challenge_id


@router.post("/payments/palmpay/init", response_model=PaymentOrderResponse)
def init_palmpay_bank_transfer(
    payload: PaymentInitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentOrderResponse:
    plan_id = payload.plan_id.strip()
    plan = _get_plan_by_id(db, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account plan not found")

    enabled = bool(plan.get("enabled", True))
    status_text = str(plan.get("status") or "Available")
    if not enabled or status_text != "Available":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account plan is not available")

    account_size = str(plan.get("name") or "").strip()
    gross_amount_kobo = _parse_naira_to_kobo(str(plan.get("price") or ""))
    if gross_amount_kobo <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan price")

    coupon_resolution = resolve_coupon_amount_for_plan(
        db,
        plan_id=plan_id,
        coupon_code=payload.coupon_code,
        original_amount_kobo=gross_amount_kobo,
    )

    provider_order_id = uuid.uuid4().hex[:32]
    notify_url = f"{settings.app_public_base_url.rstrip('/')}{settings.palmpay_payment_notify_path}"
    goods_details_json = json.dumps([
        {
            "goodsId": plan_id,
            "goodsName": account_size,
        }
    ])

    try:
        palmpay_data = create_bank_transfer_order(
            order_id=provider_order_id,
            amount_kobo=coupon_resolution.final_amount_kobo,
            title=f"NairaTrader {account_size}",
            description=f"Challenge payment for {account_size}",
            user_id=str(current_user.id),
            user_mobile_no=None,
            notify_url=notify_url,
            callback_url=settings.palmpay_checkout_callback_url,
            order_expire_seconds=settings.palmpay_order_expire_seconds,
            goods_details_json=goods_details_json,
        )

        # Query order status to get complete payment details including payer information
        if palmpay_data.get("orderNo"):
            try:
                status_data = query_order_status(order_no=str(palmpay_data.get("orderNo")))
                # Merge status data with creation data
                palmpay_data.update(status_data)
            except PalmPayPaymentError:
                # If query fails, continue with creation data
                pass

    except PalmPayPaymentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    order = PaymentOrder(
        user_id=current_user.id,
        provider="palmpay",
        provider_order_id=provider_order_id,
        provider_order_no=str(palmpay_data.get("orderNo") or "") or None,
        status=map_order_status(palmpay_data.get("orderStatus")),
        assignment_status="pending",
        currency=str(palmpay_data.get("currency") or "NGN"),
        gross_amount_kobo=gross_amount_kobo,
        discount_amount_kobo=coupon_resolution.discount_amount_kobo,
        net_amount_kobo=coupon_resolution.final_amount_kobo,
        plan_id=plan_id,
        account_size=account_size,
        coupon_code=coupon_resolution.code,
        checkout_url=str(palmpay_data.get("checkoutUrl") or "") or None,
        payer_account_type=str(palmpay_data.get("payerAccountType") or "") or None,
        payer_account_id=str(palmpay_data.get("payerAccountId") or "") or None,
        payer_bank_name=str(palmpay_data.get("payerBankName") or "") or None,
        payer_account_name=str(palmpay_data.get("payerAccountName") or "") or None,
        payer_virtual_acc_no=str(palmpay_data.get("payerVirtualAccNo") or "") or None,
        provider_raw_response=palmpay_data,
        metadata_json={
            "plan_name": account_size,
            "coupon_formatted_discount": coupon_resolution.formatted_discount_amount,
            "coupon_formatted_final": coupon_resolution.formatted_final_amount,
        },
    )

    db.add(order)
    db.commit()
    db.refresh(order)
    return _serialize_payment_order(order)


@router.get("/payments/orders/{provider_order_id}", response_model=PaymentOrderResponse)
def get_payment_order(
    provider_order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentOrderResponse:
    order = db.scalar(
        select(PaymentOrder).where(
            PaymentOrder.provider_order_id == provider_order_id.strip(),
            PaymentOrder.user_id == current_user.id,
        )
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment order not found")
    return _serialize_payment_order(order)


@router.post("/payments/orders/{provider_order_id}/refresh", response_model=PaymentStatusRefreshResponse)
def refresh_payment_order_status(
    provider_order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentStatusRefreshResponse:
    order = db.scalar(
        select(PaymentOrder).where(
            PaymentOrder.provider_order_id == provider_order_id.strip(),
            PaymentOrder.user_id == current_user.id,
        )
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment order not found")

    try:
        status_data = query_order_status(order_id=order.provider_order_id, order_no=order.provider_order_no)
    except PalmPayPaymentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    order.status = map_order_status(status_data.get("orderStatus"))
    order.provider_raw_response = status_data
    if order.status == "paid" and order.paid_at is None:
        order.paid_at = datetime.now(timezone.utc)

    if order.status == "paid":
        challenge_id = _assign_phase1_account_for_paid_order(db, order)
        db.commit()
        message = "Payment successful and account assigned" if challenge_id else "Payment successful, awaiting MT5 account assignment"
        return PaymentStatusRefreshResponse(
            provider_order_id=order.provider_order_id,
            status=order.status,
            assignment_status=order.assignment_status,
            challenge_id=order.challenge_id,
            message=message,
        )

    db.add(order)
    db.commit()
    return PaymentStatusRefreshResponse(
        provider_order_id=order.provider_order_id,
        status=order.status,
        assignment_status=order.assignment_status,
        challenge_id=order.challenge_id,
        message="Payment still pending",
    )


@router.post("/payments/palmpay/notify")
async def palmpay_notify(request: Request, db: Session = Depends(get_db)) -> str:
    payload = await request.json()
    if not isinstance(payload, dict):
        return "success"

    callback_signature = str(payload.get("sign") or payload.get("Signature") or "").strip()
    # Standard secure practice: only trust/process signed callbacks.
    if not callback_signature:
        return "success"
    if not verify_callback_signature(payload, callback_signature):
        return "success"

    data = payload.get("data")
    if not isinstance(data, dict):
        data = payload

    order_id = str(data.get("orderId") or payload.get("orderId") or "").strip()
    order_no = str(data.get("orderNo") or payload.get("orderNo") or "").strip()
    status_value = data.get("orderStatus") if isinstance(data, dict) else None

    order: PaymentOrder | None = None
    if order_id:
        order = db.scalar(select(PaymentOrder).where(PaymentOrder.provider_order_id == order_id))
    if order is None and order_no:
        order = db.scalar(select(PaymentOrder).where(PaymentOrder.provider_order_no == order_no))

    if order is None:
        return "success"

    order.status = map_order_status(status_value)
    order.provider_raw_response = data
    if order.status == "paid" and order.paid_at is None:
        order.paid_at = datetime.now(timezone.utc)
        _assign_phase1_account_for_paid_order(db, order)

    db.add(order)
    db.commit()
    return "success"

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.pin_security import generate_otp_code, hash_secret, verify_secret
from app.db.deps import get_db
from app.models.pin_otp import PinOtp
from app.models.user import User
from app.models.user_pin import UserPin
from app.tasks import send_pin_otp_email
from app.schemas.pin import (
    ChangePinRequest,
    OtpSendRequest,
    PinStatusResponse,
    ResetPinRequest,
    SetPinRequest,
)


router = APIRouter(prefix="/pin", tags=["PIN"])


def _get_user_pin(db: Session, user_id: int) -> UserPin | None:
    return db.scalar(select(UserPin).where(UserPin.user_id == user_id))


def _validate_and_consume_otp(db: Session, user_id: int, purpose: str, otp: str) -> None:
    otp_row = db.scalar(
        select(PinOtp)
        .where(PinOtp.user_id == user_id, PinOtp.purpose == purpose, PinOtp.consumed_at.is_(None))
        .order_by(PinOtp.id.desc())
    )

    if otp_row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP not found for this action")

    if otp_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

    if not verify_secret(otp, otp_row.code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    otp_row.consumed_at = datetime.now(timezone.utc)
    db.add(otp_row)


@router.get("/status", response_model=PinStatusResponse)
def get_pin_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> PinStatusResponse:
    user_pin = _get_user_pin(db, current_user.id)
    return PinStatusResponse(has_pin=user_pin is not None)


@router.post("/send-otp")
def send_pin_otp(
    payload: OtpSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    code = generate_otp_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.pin_otp_expiry_minutes)

    otp_row = PinOtp(
        user_id=current_user.id,
        purpose=payload.purpose,
        code_hash=hash_secret(code),
        expires_at=expires_at,
    )
    db.add(otp_row)
    send_pin_otp_email.delay(to_email=current_user.email, otp_code=code)
    db.commit()

    return {
        "message": f"OTP sent for {payload.purpose} PIN flow",
    }


@router.post("/set")
def set_pin(
    payload: SetPinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if payload.new_pin != payload.confirm_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN confirmation does not match")

    if _get_user_pin(db, current_user.id) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN already exists. Use change/reset")

    _validate_and_consume_otp(db, current_user.id, "set", payload.otp)

    user_pin = UserPin(user_id=current_user.id, pin_hash=hash_secret(payload.new_pin))
    db.add(user_pin)
    db.commit()
    return {"message": "PIN set successfully"}


@router.post("/change")
def change_pin(
    payload: ChangePinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user_pin = _get_user_pin(db, current_user.id)
    if user_pin is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN not set yet")

    if not verify_secret(payload.old_pin, user_pin.pin_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old PIN is incorrect")

    user_pin.pin_hash = hash_secret(payload.new_pin)
    db.add(user_pin)
    db.commit()

    return {"message": "PIN changed successfully"}


@router.post("/reset")
def reset_pin(
    payload: ResetPinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if payload.new_pin != payload.confirm_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN confirmation does not match")

    user_pin = _get_user_pin(db, current_user.id)
    if user_pin is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN not set yet")

    _validate_and_consume_otp(db, current_user.id, "reset", payload.otp)

    user_pin.pin_hash = hash_secret(payload.new_pin)
    db.add(user_pin)
    db.commit()

    return {"message": "PIN reset successfully"}

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.core.config import settings
from app.core.pin_security import generate_otp_code, hash_secret, verify_secret
from app.db.deps import get_db
from app.data.banks import NIGERIAN_BANKS
from app.models.pin_otp import PinOtp
from app.models.staff_salary import StaffSalary
from app.models.user import User
from app.schemas.salary import (
    SalaryAccountResolveRequest,
    SalaryAccountResolveResponse,
    SalaryBankListResponse,
    SalaryDisbursementPreviewResponse,
    SalaryDisbursementRequest,
    SalaryDisbursementResponse,
    SalaryTransferResult,
    StaffSalaryCreateRequest,
    StaffSalaryListResponse,
    StaffSalaryResponse,
    StaffSalaryUpdateRequest,
)
from app.services.palmpay_service import PalmPayQueryError, PalmPayService, query_bank_account_name


router = APIRouter(prefix="/admin/salaries", tags=["Admin Salaries"])

ADMIN_SALARY_OTP_PURPOSE = "admin_salary_disbursement"


def _get_bank_name(bank_code: str) -> str:
    bank = next((item for item in NIGERIAN_BANKS if item["bank_code"] == bank_code), None)
    if bank is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected bank is unavailable")
    return bank["bank_name"]


def _validate_and_consume_admin_otp(db: Session, user_id: int, otp: str) -> None:
    otp_row = db.scalar(
        select(PinOtp)
        .where(
            PinOtp.user_id == user_id,
            PinOtp.purpose == ADMIN_SALARY_OTP_PURPOSE,
            PinOtp.consumed_at.is_(None),
        )
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


@router.post("/send-otp")
def send_salary_disbursement_otp(
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if current_admin.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")

    code = generate_otp_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.pin_otp_expiry_minutes)

    otp_row = PinOtp(
        user_id=current_admin.id,
        purpose=ADMIN_SALARY_OTP_PURPOSE,
        code_hash=hash_secret(code),
        expires_at=expires_at,
    )

    db.add(otp_row)
    send_admin_settings_otp_email.delay(to_email=current_admin.email, otp_code=code)
    db.commit()

    return {"message": "OTP sent. Check your admin email."}


@router.get("/banks", response_model=SalaryBankListResponse)
def list_salary_banks(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> SalaryBankListResponse:
    return SalaryBankListResponse(
        banks=[
            {"bank_code": bank["bank_code"], "bank_name": bank["bank_name"]}
            for bank in NIGERIAN_BANKS
        ]
    )


@router.post("/resolve-account", response_model=SalaryAccountResolveResponse)
def resolve_salary_account_name(
    payload: SalaryAccountResolveRequest,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> SalaryAccountResolveResponse:
    bank_code = payload.bank_code.strip()
    account_number = payload.bank_account_number.strip()
    _get_bank_name(bank_code)

    try:
        account_name = query_bank_account_name(bank_code=bank_code, bank_account_number=account_number)
    except PalmPayQueryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return SalaryAccountResolveResponse(
        bank_code=bank_code,
        bank_account_number=account_number,
        account_name=account_name,
    )


@router.get("", response_model=StaffSalaryListResponse)
def list_staff_salaries(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> StaffSalaryListResponse:
    staff = db.scalars(select(StaffSalary).order_by(StaffSalary.created_at.desc())).all()
    total_salary = db.scalar(select(func.sum(StaffSalary.salary_amount))) or 0

    return StaffSalaryListResponse(
        staff=[StaffSalaryResponse.model_validate(row) for row in staff],
        total_count=len(staff),
        total_salary=float(total_salary),
    )


@router.post("", response_model=StaffSalaryResponse, status_code=status.HTTP_201_CREATED)
def create_staff_salary(
    payload: StaffSalaryCreateRequest,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> StaffSalaryResponse:
    bank_code = payload.bank_code.strip()
    account_number = payload.bank_account_number.strip()
    staff_name = payload.staff_name.strip()
    bank_name = _get_bank_name(bank_code)

    try:
        account_name = query_bank_account_name(bank_code=bank_code, bank_account_number=account_number)
    except PalmPayQueryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if account_name.strip().lower() != staff_name.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account name mismatch: verified name is {account_name}",
        )

    staff = StaffSalary(
        staff_name=staff_name,
        bank_code=bank_code,
        bank_name=bank_name,
        bank_account_number=account_number,
        salary_amount=payload.salary_amount,
        created_by_admin_id=current_admin.id,
        updated_by_admin_id=current_admin.id,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return StaffSalaryResponse.model_validate(staff)


@router.patch("/{staff_id}", response_model=StaffSalaryResponse)
def update_staff_salary(
    staff_id: int,
    payload: StaffSalaryUpdateRequest,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> StaffSalaryResponse:
    staff = db.get(StaffSalary, staff_id)
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff record not found")

    if payload.staff_name is not None:
        staff.staff_name = payload.staff_name.strip()
    if payload.salary_amount is not None:
        staff.salary_amount = payload.salary_amount

    staff.updated_by_admin_id = current_admin.id

    db.add(staff)
    db.commit()
    db.refresh(staff)
    return StaffSalaryResponse.model_validate(staff)


@router.delete("/{staff_id}")
def delete_staff_salary(
    staff_id: int,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    staff = db.get(StaffSalary, staff_id)
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff record not found")

    db.delete(staff)
    db.commit()
    return {"message": "Staff salary deleted"}


@router.get("/disburse/preview", response_model=SalaryDisbursementPreviewResponse)
def preview_salary_disbursement(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> SalaryDisbursementPreviewResponse:
    staff = db.scalars(select(StaffSalary).order_by(StaffSalary.created_at.desc())).all()
    total_amount = float(sum(row.salary_amount for row in staff))

    return SalaryDisbursementPreviewResponse(
        summary={
            "total_staff": len(staff),
            "total_amount": total_amount,
        },
        staff=[StaffSalaryResponse.model_validate(row) for row in staff],
    )


@router.post("/disburse", response_model=SalaryDisbursementResponse)
def disburse_salaries(
    payload: SalaryDisbursementRequest,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> SalaryDisbursementResponse:
    if current_admin.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")

    _validate_and_consume_admin_otp(db, current_admin.id, payload.otp)

    staff_list = db.scalars(select(StaffSalary).order_by(StaffSalary.created_at.desc())).all()
    if not staff_list:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No staff salaries configured")

    palm_pay = PalmPayService()
    transfers: list[SalaryTransferResult] = []

    for staff in staff_list:
        description = payload.description or f"Salary payment for {staff.staff_name}"
        try:
            transfer_result = palm_pay.create_transfer(
                amount=staff.salary_amount,
                account_number=staff.bank_account_number,
                bank_code=staff.bank_code,
                account_name=staff.staff_name,
                description=description,
            )
            transfers.append(
                SalaryTransferResult(
                    staff_id=staff.id,
                    staff_name=staff.staff_name,
                    amount=staff.salary_amount,
                    status="success",
                    reference=str(transfer_result.get("reference") or ""),
                )
            )
        except Exception as exc:
            transfers.append(
                SalaryTransferResult(
                    staff_id=staff.id,
                    staff_name=staff.staff_name,
                    amount=staff.salary_amount,
                    status="failed",
                    message=str(exc),
                )
            )

    summary = {
        "total_staff": len(staff_list),
        "total_amount": float(sum(row.salary_amount for row in staff_list)),
    }

    return SalaryDisbursementResponse(summary=summary, transfers=transfers)
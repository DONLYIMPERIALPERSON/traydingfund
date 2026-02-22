from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.deps import get_db
from app.models.migration_request import MigrationRequest
from app.models.user import User
from app.schemas.migration_request import (
    BankVerificationRequest,
    BankVerificationResponse,
    MigrationRequestCreate,
    MigrationRequestResponse,
)
from app.services.palmpay_service import PalmPayService


router = APIRouter(prefix="/migration", tags=["Migration"])


@router.post("/requests", response_model=MigrationRequestResponse)
def create_migration_request(
    request: MigrationRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MigrationRequestResponse:
    # Check if user already has a pending request
    existing_request = db.scalar(
        select(MigrationRequest).where(
            MigrationRequest.user_id == current_user.id,
            MigrationRequest.status == "pending"
        )
    )
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending migration request"
        )

    # Validate request type
    if request.request_type not in ["phase2", "funded"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request type. Must be 'phase2' or 'funded'"
        )

    # For funded requests, bank details are required
    if request.request_type == "funded":
        if not all([request.bank_account_number, request.bank_code]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank account number and bank code are required for funded requests"
            )

    migration_request = MigrationRequest(
        user_id=current_user.id,
        request_type=request.request_type,
        account_size=request.account_size,
        mt5_server=request.mt5_server,
        mt5_account_number=request.mt5_account_number,
        mt5_password=request.mt5_password,
        bank_account_number=request.bank_account_number,
        bank_code=request.bank_code,
        bank_name=request.bank_name,
        account_name=request.account_name,
        status="pending"
    )

    db.add(migration_request)
    db.commit()
    db.refresh(migration_request)

    return MigrationRequestResponse.model_validate(migration_request)


@router.get("/requests/my", response_model=list[MigrationRequestResponse])
def get_my_migration_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MigrationRequestResponse]:
    requests = db.scalars(
        select(MigrationRequest)
        .where(MigrationRequest.user_id == current_user.id)
        .order_by(MigrationRequest.created_at.desc())
    ).all()

    return [MigrationRequestResponse.model_validate(request) for request in requests]


@router.post("/verify-bank", response_model=BankVerificationResponse)
def verify_bank_account(
    request: BankVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BankVerificationResponse:
    palm_pay = PalmPayService()

    try:
        result = palm_pay.query_bank_account(
            account_number=request.account_number,
            bank_code=request.bank_code
        )

        return BankVerificationResponse(
            account_name=result["accountName"],
            bank_name=result["bankName"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank verification failed: {str(e)}"
        )
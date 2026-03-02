from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MigrationRequestBase(BaseModel):
    request_type: str  # "phase2" or "funded"
    account_size: str
    mt5_server: str
    mt5_account_number: str
    mt5_password: str
    bank_account_number: Optional[str] = None
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_name: Optional[str] = None


class MigrationRequestCreate(MigrationRequestBase):
    pass


class MigrationRequestUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    withdrawal_amount: Optional[float] = None


class MigrationRequestResponse(MigrationRequestBase):
    id: int
    user_id: int
    status: str
    admin_notes: Optional[str] = None
    processed_by_admin_id: Optional[int] = None
    processed_at: Optional[datetime] = None
    locked_by_admin_id: Optional[int] = None
    locked_at: Optional[datetime] = None
    lock_expires_at: Optional[datetime] = None
    withdrawal_amount: Optional[float] = None
    transfer_reference: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MigrationRequestLockResponse(BaseModel):
    id: int
    status: str
    locked_by_admin_id: Optional[int] = None
    locked_at: Optional[datetime] = None
    lock_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BankVerificationRequest(BaseModel):
    account_number: str
    bank_code: str


class BankVerificationResponse(BaseModel):
    account_name: str
    bank_name: str
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SalaryBankListItem(BaseModel):
    bank_code: str
    bank_name: str


class SalaryBankListResponse(BaseModel):
    banks: List[SalaryBankListItem]


class SalaryAccountResolveRequest(BaseModel):
    bank_code: str = Field(..., min_length=1)
    bank_account_number: str = Field(..., min_length=10, max_length=10)


class SalaryAccountResolveResponse(BaseModel):
    bank_code: str
    bank_account_number: str
    account_name: str


class StaffSalaryCreateRequest(BaseModel):
    bank_code: str = Field(..., min_length=1)
    bank_account_number: str = Field(..., min_length=10, max_length=10)
    staff_name: str = Field(..., min_length=1)
    salary_amount: float = Field(..., gt=0)


class StaffSalaryUpdateRequest(BaseModel):
    staff_name: Optional[str] = None
    salary_amount: Optional[float] = Field(None, gt=0)


class StaffSalaryResponse(BaseModel):
    id: int
    staff_name: str
    bank_code: str
    bank_name: str
    bank_account_number: str
    salary_amount: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StaffSalaryListResponse(BaseModel):
    staff: List[StaffSalaryResponse]
    total_count: int
    total_salary: float


class SalaryDisbursementSummary(BaseModel):
    total_staff: int
    total_amount: float


class SalaryDisbursementPreviewResponse(BaseModel):
    summary: SalaryDisbursementSummary
    staff: List[StaffSalaryResponse]


class SalaryDisbursementRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6, pattern="^\\d{6}$")
    description: Optional[str] = None


class SalaryTransferResult(BaseModel):
    staff_id: int
    staff_name: str
    amount: float
    status: str
    reference: Optional[str] = None
    message: Optional[str] = None


class SalaryDisbursementResponse(BaseModel):
    summary: SalaryDisbursementSummary
    transfers: List[SalaryTransferResult]
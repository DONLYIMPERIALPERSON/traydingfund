from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class FundedAccountPayout(BaseModel):
    """Payout information for a single funded account"""
    account_id: int
    challenge_id: str
    account_size: str
    current_balance: float
    available_payout: float
    profit_cap_amount: float
    profit_split_percent: int
    minimum_withdrawal_amount: float
    withdrawal_count: int
    last_withdrawal_at: Optional[datetime]

    class Config:
        from_attributes = True


class WithdrawalHistory(BaseModel):
    """Withdrawal transaction history"""
    id: int
    amount: float
    status: str
    requested_at: datetime
    completed_at: Optional[datetime]
    reference: str

    class Config:
        from_attributes = True


class PayoutEligibility(BaseModel):
    """User payout eligibility information"""
    is_eligible: bool
    has_verified_bank_account: bool
    has_available_payout: bool
    minimum_payout_amount: float
    bank_account_masked: Optional[str] = None
    ineligibility_reasons: List[str] = Field(default_factory=list, description="Reasons why user is not eligible for payout")


class PayoutSummaryResponse(BaseModel):
    """Complete payout summary for user dashboard"""
    total_available_payout: float = Field(..., description="Total payout available across all funded accounts")
    total_earned_all_time: float = Field(..., description="Total earnings including withdrawn amounts")
    funded_accounts: List[FundedAccountPayout] = Field(..., description="Detailed payout info for each funded account")
    withdrawal_history: List[WithdrawalHistory] = Field(..., description="Recent withdrawal transactions")
    eligibility: PayoutEligibility = Field(..., description="Payout eligibility status")


class PayoutRequest(BaseModel):
    """Request to initiate a payout"""
    amount: Optional[float] = Field(None, gt=0, description="Amount to withdraw (optional; defaults to max allowed)")
    account_id: Optional[int] = Field(None, description="Specific account to withdraw from (optional)")
    pin: str = Field(..., min_length=4, max_length=4, pattern="^\\d{4}$", description="Transaction PIN")


class PayoutRequestResponse(BaseModel):
    """Response after initiating a payout request"""
    request_id: str
    amount: float
    status: str
    estimated_completion: Optional[datetime]
    message: str
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AffiliateBase(BaseModel):
    user_id: int
    code: str
    created_at: datetime


class AffiliateCreate(BaseModel):
    user_id: int


class Affiliate(AffiliateBase):
    class Config:
        from_attributes = True


class AffiliateCommissionBase(BaseModel):
    affiliate_id: int
    order_id: int
    customer_user_id: Optional[int] = None
    customer_email: Optional[str] = None
    unique_customer_key: str
    amount: float = Field(..., ge=0)
    status: str = Field(default="approved", pattern="^(approved|revoked)$")
    product_summary: Optional[str] = None
    created_at: datetime


class AffiliateCommissionCreate(BaseModel):
    affiliate_id: int
    order_id: int
    customer_user_id: Optional[int] = None
    customer_email: Optional[str] = None
    unique_customer_key: str
    amount: float = Field(..., ge=0)
    product_summary: Optional[str] = None


class AffiliateCommission(AffiliateCommissionBase):
    id: int

    class Config:
        from_attributes = True


class AffiliatePayoutBase(BaseModel):
    affiliate_id: int
    amount: float = Field(..., ge=0)
    status: str = Field(default="pending", pattern="^(pending|approved|rejected)$")
    requested_at: datetime
    approved_at: Optional[datetime] = None


class AffiliatePayoutCreate(BaseModel):
    affiliate_id: int
    amount: float = Field(..., ge=0)


class AffiliatePayout(AffiliatePayoutBase):
    id: int

    class Config:
        from_attributes = True


class AffiliateMilestoneBase(BaseModel):
    affiliate_id: int
    level: int = Field(..., ge=1)
    status: str = Field(default="pending", pattern="^(pending|approved|rejected)$")
    requested_at: datetime
    processed_at: Optional[datetime] = None


class AffiliateMilestoneCreate(BaseModel):
    affiliate_id: int
    level: int = Field(..., ge=1)


class AffiliateMilestone(AffiliateMilestoneBase):
    id: int

    class Config:
        from_attributes = True


class AffiliateClickBase(BaseModel):
    affiliate_id: int
    ip_hash: str
    ua_hash: str
    created_at: datetime


class AffiliateClickCreate(BaseModel):
    affiliate_id: int
    ip_hash: str
    ua_hash: str


class AffiliateClick(AffiliateClickBase):
    id: int

    class Config:
        from_attributes = True


# Response schemas for the frontend
class AffiliateStats(BaseModel):
    available_balance: float
    total_earned: float
    referrals: int
    impressions: int


class AffiliateReward(BaseModel):
    amount: int  # e.g., 600000 for ₦600k
    status: str  # "live", "locked", "claimed"
    progress: Optional[int] = None  # current progress towards target
    target: Optional[int] = None    # target number of referrals
    remaining: Optional[int] = None # remaining referrals needed


class AffiliateTransaction(BaseModel):
    date: str
    type: str
    commission: float


class AffiliatePayoutHistory(BaseModel):
    date: str
    status: str
    amount: float


class BankDetails(BaseModel):
    bank_name: str
    account_name: str
    account_number: str


class AffiliateDashboard(BaseModel):
    referral_link: str
    stats: AffiliateStats
    rewards: list[AffiliateReward]
    recent_transactions: list[AffiliateTransaction]
    recent_payouts: list[AffiliatePayoutHistory]
    bank_details: Optional[BankDetails] = None


class AffiliateAttributionRequest(BaseModel):
    affiliate_code: str = Field(..., min_length=1, max_length=64)


class PayoutRequest(BaseModel):
    amount: float = Field(..., ge=0)


class MilestoneClaimRequest(BaseModel):
    level_index: int = Field(..., ge=0, le=3)


class BankDetailsUpdate(BaseModel):
    bank_code: str
    account_name: str
    account_number: str

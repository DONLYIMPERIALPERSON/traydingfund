from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    nick_name: str | None = Field(default=None, min_length=1, max_length=255)


class VerifyBankAccountRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bank_code: str = Field(min_length=2, max_length=100)
    bank_account_number: str = Field(min_length=6, max_length=50)


class BankListItem(BaseModel):
    bank_code: str
    bank_name: str
    bank_url: str | None = None


class BankListResponse(BaseModel):
    banks: list[BankListItem]


class ResolveAccountNameResponse(BaseModel):
    bank_code: str
    bank_account_number: str
    account_name: str


class SubmitKycRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bank_code: str = Field(min_length=2, max_length=100)
    bank_account_number: str = Field(min_length=6, max_length=50)


class BankAccountResponse(BaseModel):
    user_id: int
    bank_code: str
    bank_account_number: str
    account_name: str
    is_verified: bool
    verified_at: str | None


class KycSubmissionResponse(BaseModel):
    status: str
    message: str
    kyc_status: str
    bank_account: BankAccountResponse


class KycEligibilityResponse(BaseModel):
    eligible: bool
    message: str


class WithdrawalPrecheckResponse(BaseModel):
    kyc_completed: bool
    bank_account_verified: bool
    has_funded_account: bool
    eligible_for_withdrawal: bool
    message: str
    payout_destination: BankAccountResponse | None


class UserChallengeAccountListItem(BaseModel):
    challenge_id: str
    account_size: str
    phase: str
    objective_status: str
    display_status: str
    is_active: bool
    mt5_account: str | None
    started_at: str | None
    breached_at: str | None
    passed_at: str | None


class UserChallengeAccountListResponse(BaseModel):
    has_any_accounts: bool
    has_active_accounts: bool
    active_accounts: list[UserChallengeAccountListItem]
    history_accounts: list[UserChallengeAccountListItem]


class UserChallengeObjectiveStatus(BaseModel):
    label: str
    status: str
    note: str | None = None


class UserChallengeMetrics(BaseModel):
    balance: float
    equity: float
    unrealized_pnl: float
    max_permitted_loss_left: float
    highest_balance: float
    breach_balance: float
    profit_target_balance: float
    win_rate: float
    closed_trades_count: int
    winning_trades_count: int
    lots_traded_total: float
    today_closed_pnl: float
    today_trades_count: int
    today_lots_total: float
    min_trading_days_required: float
    min_trading_days_met: bool
    stage_elapsed_hours: float
    scalping_violations_count: int


class UserChallengeCredentials(BaseModel):
    server: str
    account_number: str
    password: str
    investor_password: str


class UserChallengeAccountDetailResponse(BaseModel):
    challenge_id: str
    account_size: str
    phase: str
    objective_status: str
    breached_reason: str | None
    started_at: str | None
    breached_at: str | None
    passed_at: str | None
    mt5_account: str | None
    last_feed_at: str | None
    last_refresh_requested_at: str | None
    metrics: UserChallengeMetrics
    objectives: dict[str, UserChallengeObjectiveStatus]
    credentials: UserChallengeCredentials | None
    # Funded account profit data
    funded_profit_raw: float | None = None
    funded_profit_capped: float | None = None
    funded_profit_cap_amount: float | None = None
    funded_user_payout_amount: float | None = None

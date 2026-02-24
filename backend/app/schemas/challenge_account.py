from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChallengeAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    challenge_id: str
    user_id: int
    account_size: str
    current_stage: str
    phase1_mt5_account_id: int | None
    phase2_mt5_account_id: int | None
    funded_mt5_account_id: int | None
    active_mt5_account_id: int | None
    last_withdrawn_mt5_account_id: int | None
    objective_status: str
    breached_reason: str | None
    passed_stage: str | None
    initial_balance: float
    dd_amount: float
    highest_balance: float
    breach_balance: float
    profit_target_balance: float
    latest_balance: float | None
    latest_equity: float | None
    scalping_violations_count: int
    funded_profit_raw: float
    funded_profit_capped: float
    funded_profit_cap_amount: float
    funded_user_payout_amount: float
    withdrawal_count: int
    last_feed_at: datetime | None
    breached_at: datetime | None
    passed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ChallengeAccountListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    challenge_id: str
    user_id: int
    account_size: str
    phase: str
    mt5_account: str | None
    mt5_server: str | None
    mt5_password: str | None
    objective_status: str
    breached_reason: str | None


class ChallengeFeedUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_number: str = Field(min_length=1, max_length=120)
    balance: float = Field(gt=0)
    equity: float | None = Field(default=None, gt=0)
    closed_trade_durations_seconds: list[int] = Field(default_factory=list)
    scalping_breach_increment: int | None = Field(default=None, ge=0)
    equity_breach_signal: bool | None = None
    balance_breach_signal: bool | None = None
    stage_pass_signal: bool | None = None
    closed_trades_count_increment: int | None = Field(default=None, ge=0)
    winning_trades_count_increment: int | None = Field(default=None, ge=0)
    lots_traded_increment: float | None = Field(default=None, ge=0)
    today_closed_pnl: float | None = None
    today_trades_count: int | None = Field(default=None, ge=0)
    today_lots_total: float | None = Field(default=None, ge=0)
    observed_at: datetime | None = None


class InternalChallengeFeedUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    balance: float = Field(gt=0)
    equity: float | None = Field(default=None, gt=0)
    closed_trade_durations_seconds: list[int] = Field(default_factory=list)
    scalping_breach_increment: int | None = Field(default=None, ge=0)
    equity_breach_signal: bool | None = None
    balance_breach_signal: bool | None = None
    stage_pass_signal: bool | None = None
    closed_trades_count_increment: int | None = Field(default=None, ge=0)
    winning_trades_count_increment: int | None = Field(default=None, ge=0)
    lots_traded_increment: float | None = Field(default=None, ge=0)
    today_closed_pnl: float | None = None
    today_trades_count: int | None = Field(default=None, ge=0)
    today_lots_total: float | None = Field(default=None, ge=0)
    observed_at: datetime | None = None


class ChallengeFeedUpdateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    challenge_id: str
    stage: str
    objective_status: str
    breached_reason: str | None
    passed_stage: str | None
    highest_balance: float
    breach_balance: float
    profit_target_balance: float
    scalping_violations_count: int
    funded_profit_raw: float
    funded_profit_capped: float
    funded_profit_cap_amount: float
    funded_user_payout_amount: float
    unrealized_pnl: float
    max_permitted_loss_left: float
    win_rate: float
    min_trading_days_required: float
    min_trading_days_met: bool
    stage_elapsed_hours: float
    closed_trades_count: int
    winning_trades_count: int
    lots_traded_total: float
    today_closed_pnl: float
    today_trades_count: int
    today_lots_total: float
    transitioned_to_stage: str | None


class FundedWithdrawalApproveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    approved: bool


class FundedWithdrawalApproveResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    challenge_id: str
    old_funded_account_number: str
    new_funded_account_number: str
    withdrawal_count: int

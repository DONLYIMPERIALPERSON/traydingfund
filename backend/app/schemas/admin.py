from pydantic import BaseModel, ConfigDict, Field


class AdminAllowlistCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=5, max_length=255)
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: str = Field(default="admin", pattern="^(admin|super_admin)$")
    require_mfa: bool = True
    allowed_pages: list[str] | None = Field(default=None, description="List of allowed page IDs for this admin")
    can_assign_mt5: bool | None = Field(default=None, description="Allow admin to assign MT5 accounts")


class AdminAllowlistUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: str | None = Field(default=None, pattern="^(admin|super_admin)$")
    status: str | None = Field(default=None, pattern="^(active|disabled)$")
    require_mfa: bool | None = None
    allowed_pages: list[str] | None = Field(default=None, description="List of allowed page IDs for this admin")
    can_assign_mt5: bool | None = Field(default=None, description="Allow admin to assign MT5 accounts")

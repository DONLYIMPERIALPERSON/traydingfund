"""Import ORM models here so Alembic can discover metadata."""

from app.models.user import User
from app.models.user_pin import UserPin
from app.models.pin_otp import PinOtp
from app.models.admin_allowlist import AdminAllowlist
from app.models.challenge_config import ChallengeConfig
from app.models.coupon import Coupon
from app.models.bank_directory import BankDirectory
from app.models.mt5_account import MT5Account
from app.models.challenge_account import ChallengeAccount
from app.models.user_bank_account import UserBankAccount
from app.models.payment_order import PaymentOrder
from app.models.certificate import Certificate
from app.models.email_log import EmailLog
from app.models.migration_request import MigrationRequest
from app.models.support import SupportChat, SupportMessage

__all__ = [
    "User",
    "UserPin",
    "PinOtp",
    "AdminAllowlist",
    "ChallengeConfig",
    "Coupon",
    "BankDirectory",
    "MT5Account",
    "ChallengeAccount",
    "UserBankAccount",
    "PaymentOrder",
    "Certificate",
    "EmailLog",
    "MigrationRequest",
    "SupportChat",
    "SupportMessage",
]

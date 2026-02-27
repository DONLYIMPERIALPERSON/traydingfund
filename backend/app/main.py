import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.affiliate_routes import router as affiliate_router
from app.api.admin_affiliate_routes import router as admin_affiliate_router
from app.api.auth_routes import router as auth_router
from app.api.admin_auth_routes import router as admin_auth_router
from app.api.admin_certificates_routes import router as admin_certificates_router
from app.api.admin_kyc_routes import router as admin_kyc_router
from app.api.admin_orders_routes import router as admin_orders_router
from app.api.admin_payout_routes import router as admin_payout_router
from app.api.admin_users_routes import router as admin_users_router
from app.api.challenge_config_routes import router as challenge_config_router
from app.api.challenge_accounts_routes import router as challenge_accounts_router
from app.api.coupon_routes import router as coupon_router
from app.api.payment_routes import router as payment_router
from app.api.mt5_routes import router as mt5_router
from app.api.pin_routes import router as pin_router
from app.api.payout_routes import router as payout_router
from app.api.profile_routes import router as profile_router
from app.api.certificate_routes import router as certificate_router
from app.api.support_routes import router as support_router
from app.api.admin_support_routes import router as admin_support_router
from app.api.admin_announcement_routes import router as admin_announcement_router
from app.api.admin_email_routes import router as admin_email_router
from app.api.admin_finance_routes import router as admin_finance_router
from app.api.admin_workboard_routes import router as admin_workboard_router
from app.api.admin_migration_routes import router as admin_migration_router
from app.api.admin_salary_routes import router as admin_salary_router
from app.api.migration_routes import router as migration_router
from app.api.internal_routes import router as internal_router
from app.core.config import settings
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),  # Console output
    ]
)

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.redis import redis_client

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    integrations=[StarletteIntegration(), FastApiIntegration()],
    traces_sample_rate=1.0,
)

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)
app = FastAPI(title=settings.app_name)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins = [origin.strip() for origin in settings.backend_cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # Allow local dev hosts across dynamic ports (e.g., Vite on 3004)
    # in addition to explicit origins from BACKEND_CORS_ORIGINS.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(affiliate_router, tags=["Affiliate"])
app.include_router(admin_affiliate_router, tags=["Admin Affiliate"])
app.include_router(auth_router, tags=["Authentication"])
app.include_router(admin_auth_router, tags=["Admin Authentication"])
app.include_router(admin_certificates_router, tags=["Admin Certificates"])
app.include_router(admin_kyc_router, tags=["Admin KYC"])
app.include_router(admin_orders_router, tags=["Admin Orders"])
app.include_router(admin_payout_router, tags=["Admin Payouts"])
app.include_router(admin_users_router, tags=["Admin Users"])
app.include_router(challenge_config_router, tags=["Challenge Config"])
app.include_router(challenge_accounts_router, tags=["Challenge Accounts"])
app.include_router(coupon_router, tags=["Coupons"])
app.include_router(payment_router, tags=["Payment"])
app.include_router(mt5_router, tags=["MT5"])
app.include_router(payout_router, tags=["Payouts"])
app.include_router(profile_router, tags=["Profile"])
app.include_router(pin_router, tags=["PIN"])
app.include_router(certificate_router, tags=["Certificates"])
app.include_router(support_router, tags=["Support"])
app.include_router(admin_support_router, tags=["Admin Support"])
app.include_router(admin_announcement_router, tags=["Admin Announcements"])
app.include_router(admin_email_router, tags=["Admin Emails"])
app.include_router(admin_finance_router, tags=["Admin Finance"])
app.include_router(admin_workboard_router, tags=["Admin Workboard"])
app.include_router(admin_migration_router, tags=["Admin Migration"])
app.include_router(admin_salary_router, tags=["Admin Salaries"])
app.include_router(migration_router, tags=["Migration"])
app.include_router(internal_router, tags=["Internal"])


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.app_host, port=settings.app_port, reload=True)

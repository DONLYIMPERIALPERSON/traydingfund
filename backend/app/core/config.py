from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    sentry_dsn: str = ""
    app_name: str
    app_env: str
    app_host: str
    app_port: int
    backend_cors_origins: str
    database_url: str
    descope_project_id: str
    descope_discovery_url: str
    descope_jwks_url: str
    descope_issuer: str
    descope_audience: str
    resend_api_key: str
    resend_api_base_url: str
    resend_from_email: str
    pin_otp_expiry_minutes: int
    admin_require_mfa: bool
    admin_bootstrap_secret: str
    challenge_feed_secret: str
    challenge_scalping_min_seconds: int
    challenge_scalping_max_violations: int
    palmpay_base_url: str
    palmpay_country_code: str
    palmpay_app_id: str
    palmpay_merchant_private_key: str
    palmpay_platform_public_key: str = ""
    palmpay_query_bank_account_path: str = "/api/v2/payment/merchant/payout/queryBankAccount"
    palmpay_create_order_path: str = "/api/v2/payment/merchant/createorder"
    palmpay_query_order_path: str = "/api/v2/payment/merchant/order/queryStatus"
    app_public_base_url: str
    palmpay_payment_notify_path: str
    palmpay_checkout_callback_url: str
    palmpay_order_expire_seconds: int = 1800
    palmpay_api_version: str = "V1.1"
    cloudflare_r2_endpoint_url: str
    cloudflare_r2_access_key_id: str
    cloudflare_r2_secret_access_key: str
    cloudflare_r2_bucket_name: str
    cloudflare_r2_public_url: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

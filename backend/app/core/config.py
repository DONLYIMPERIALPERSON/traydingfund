from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NairaTrader Backend"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 5500
    backend_cors_origins: str = "http://localhost:3002,http://127.0.0.1:3002,http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/nairatrader"
    descope_project_id: str = ""
    descope_discovery_url: str = ""
    descope_jwks_url: str = ""
    descope_issuer: str = ""
    descope_audience: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

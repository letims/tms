from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FLEET_")

    database_url: str = "sqlite+aiosqlite:///./fleet_telemetry.db"

    # Anomaly detection thresholds
    low_battery_pct: float = 15.0
    critical_battery_pct: float = 5.0
    overspeed_mps: float = 5.0
    moving_with_fault_speed_mps: float = 0.1
    stale_vehicle_seconds: int = 30

    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()

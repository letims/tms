from datetime import datetime, timedelta, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from fleet_telemetry.constants import ZONES

_FUTURE_GRACE_SECONDS = 5  # tolerate minor clock skew between vehicles and server


class TelemetryEvent(BaseModel):
    vehicle_id: str = Field(min_length=1)
    timestamp: datetime
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    battery_pct: float = Field(ge=0.0, le=100.0)
    speed_mps: float = Field(ge=0.0)
    status: Literal["idle", "moving", "charging", "fault"]
    error_codes: list[str] = []
    zone_entered: str | None = None

    @field_validator("timestamp")
    @classmethod
    def timestamp_not_in_future(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        # Normalise to UTC for comparison; naive timestamps are assumed UTC.
        v_utc = v if v.tzinfo is not None else v.replace(tzinfo=timezone.utc)
        if v_utc > now + timedelta(seconds=_FUTURE_GRACE_SECONDS):
            raise ValueError(
                f"timestamp is in the future ({v.isoformat()}); "
                "vehicle clocks must be synchronised to UTC"
            )
        return v

    @field_validator("zone_entered")
    @classmethod
    def zone_must_be_registered(cls, v: str | None) -> str | None:
        if v is not None and v not in ZONES:
            raise ValueError(f"zone_entered '{v}' is not a registered zone")
        return v


class TelemetryResponse(BaseModel):
    status: str
    anomalies_detected: int


class ZoneCount(BaseModel):
    zone_id: str
    entry_count: int


class ZoneCountsResponse(BaseModel):
    zones: list[ZoneCount]


class AnomalyResponse(BaseModel):
    id: int
    vehicle_id: str
    detected_at: datetime
    anomaly_type: str
    details: dict
    telemetry_event_id: int

    model_config = {"from_attributes": True}


class FleetStateResponse(BaseModel):
    counts: dict[str, int]
    total: int
    as_of: datetime


class HealthResponse(BaseModel):
    status: str
    db: str
    timestamp: datetime


class VehicleResponse(BaseModel):
    vehicle_id: str
    status: str
    battery_pct: float
    lat: float
    lon: float
    speed_mps: float
    last_seen: datetime

    model_config = {"from_attributes": True}


class VehicleListResponse(BaseModel):
    vehicles: list[VehicleResponse]
    total: int
    limit: int
    offset: int

from datetime import datetime
from pydantic import BaseModel, field_validator


class SensorReadingCreate(BaseModel):
    sensor_id: int
    value: float

    @field_validator("value")
    @classmethod
    def value_must_be_plausible(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Reading value cannot be negative")
        if v > 200:
            raise ValueError(
                "Reading value is outside any physically plausible range for a "
                "sensor (max 200). Check the sensor for malfunction."
            )
        return v


class SensorReadingResponse(BaseModel):
    id: int
    sensor_id: int
    value: float
    recorded_at: datetime

    class Config:
        from_attributes = True
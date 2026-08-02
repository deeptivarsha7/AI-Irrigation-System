from datetime import datetime
from pydantic import BaseModel


class SensorReadingCreate(BaseModel):
    sensor_id: int
    value: float


class SensorReadingResponse(BaseModel):
    id: int
    sensor_id: int
    value: float
    recorded_at: datetime

    class Config:
        from_attributes = True
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SensorCreate(BaseModel):
    farm_id: int
    sensor_type: str
    sensor_identifier: str


class SensorUpdate(BaseModel):
    sensor_type: Optional[str] = None
    status: Optional[str] = None


class SensorResponse(BaseModel):
    id: int
    farm_id: int
    sensor_type: str
    sensor_identifier: str
    status: str
    installed_at: datetime

    class Config:
        from_attributes = True
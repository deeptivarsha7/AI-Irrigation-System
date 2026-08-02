from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FarmCreate(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float
    area_hectares: float
    soil_type: str


class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = None
    soil_type: Optional[str] = None


class FarmResponse(BaseModel):
    id: int
    user_id: int
    name: str
    location: str
    latitude: float
    longitude: float
    area_hectares: float
    soil_type: str
    created_at: datetime

    class Config:
        from_attributes = True
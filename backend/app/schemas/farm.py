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
    crop_type: str
    crop_growth_stage: str
    irrigation_type: str
    water_source: str
    mulching_used: str
    region: str


class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = None
    soil_type: Optional[str] = None
    crop_type: Optional[str] = None
    crop_growth_stage: Optional[str] = None
    irrigation_type: Optional[str] = None
    water_source: Optional[str] = None
    mulching_used: Optional[str] = None
    region: Optional[str] = None


class FarmResponse(BaseModel):
    id: int
    user_id: int
    name: str
    location: str
    latitude: float
    longitude: float
    area_hectares: float
    soil_type: str
    crop_type: str
    crop_growth_stage: str
    irrigation_type: str
    water_source: str
    mulching_used: str
    region: str
    created_at: datetime

    class Config:
        from_attributes = True
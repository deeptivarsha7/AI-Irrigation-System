from datetime import datetime
from pydantic import BaseModel, field_validator


class IrrigationEventCreate(BaseModel):
    water_amount_mm: float
    irrigated_at: datetime

    @field_validator("water_amount_mm")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0 or v > 300:
            raise ValueError("Water amount must be between 0 and 300mm — check for a data entry error.")
        return v


class IrrigationEventResponse(BaseModel):
    id: int
    farm_id: int
    water_amount_mm: float
    source: str
    irrigated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
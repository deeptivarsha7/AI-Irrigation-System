from datetime import datetime
from pydantic import BaseModel


class PredictionResponse(BaseModel):
    water_required_mm: float
    irrigation_need: str
    confidence: str
    soil_moisture_used: float
    season: str
    recommendation: str
    generated_at: str
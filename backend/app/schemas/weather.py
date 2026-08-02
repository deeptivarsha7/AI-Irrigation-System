from datetime import datetime
from pydantic import BaseModel


class DailyForecast(BaseModel):
    date: str
    min_temp: float
    max_temp: float
    expected_rainfall_mm: float
    condition: str


class WeatherResponse(BaseModel):
    temperature: float
    humidity: int
    rainfall_mm: float
    condition: str
    forecast: list[DailyForecast]
    fetched_at: datetime
    stale: bool = False
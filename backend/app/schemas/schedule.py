from pydantic import BaseModel


class ScheduleEvent(BaseModel):
    day_offset: int          # 0 = today, 1 = tomorrow, etc. — relative to forecast[0]
    date: str                 # copied from the matching DailyForecast.date
    time_slot: str
    water_amount_mm: float
    reason: str


class ScheduleResponse(BaseModel):
    need_level: str
    confidence: str
    total_water_required_mm: float
    scheduled_mm: float
    unscheduled_mm: float
    events: list[ScheduleEvent]
    summary: str
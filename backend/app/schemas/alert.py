from pydantic import BaseModel
from typing import List


class Alert(BaseModel):
    type: str
    severity: str
    icon: str
    title: str
    message: str


class AlertsResponse(BaseModel):
    farm_id: int
    alert_count: int
    alerts: List[Alert]
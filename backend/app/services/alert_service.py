"""
Alert engine — Milestone 3.

Evaluates a farm's current state (prediction, schedule, irrigation history,
sensor freshness, weather) against a fixed set of rules and returns any
alerts that currently apply. This is deliberately rule-based, not a
separate ML model — the underlying signals (prediction confidence,
schedule totals, sensor staleness) are already ML/weather-derived, so the
alert layer's job is just to interpret those existing signals into
actionable warnings, not to re-predict anything.

Each alert includes a human-readable message and a severity, so the
frontend can render them consistently without re-deriving wording.
"""

from datetime import datetime, timedelta
from typing import List, Optional


SENSOR_STALE_THRESHOLD_HOURS = 6
DROUGHT_NO_IRRIGATION_HOURS = 48
OVER_WATERING_MULTIPLIER = 1.5
HEAVY_RAIN_THRESHOLD_MM = 4.0


def evaluate_alerts(
    prediction: dict,
    schedule: dict,
    recent_irrigation_events: List[dict],
    latest_sensor_reading_at: Optional[datetime],
    weather: dict,
) -> List[dict]:
    alerts = []
    now = datetime.utcnow()

    # --- Drought risk ---
    if prediction["irrigation_need"] == "High":
        last_irrigation = max(
            (e["irrigated_at"] for e in recent_irrigation_events), default=None
        )
        hours_since = (
            (now - last_irrigation).total_seconds() / 3600
            if last_irrigation else None
        )
        if hours_since is None or hours_since > DROUGHT_NO_IRRIGATION_HOURS:
            alerts.append({
                "type": "drought_risk",
                "severity": "high",
                "icon": "🌵",
                "title": "Drought risk",
                "message": (
                    "This field currently shows High irrigation need and hasn't "
                    "been watered in over 48 hours. Irrigate soon to avoid crop stress."
                ),
            })

    # --- Over-watering risk ---
    total_recent_mm = sum(e["water_amount_mm"] for e in recent_irrigation_events)
    recommended_mm = schedule.get("total_water_required_mm", 0)
    if recommended_mm > 0 and total_recent_mm > recommended_mm * OVER_WATERING_MULTIPLIER:
        alerts.append({
            "type": "over_watering",
            "severity": "medium",
            "icon": "🌊",
            "title": "Possible over-watering",
            "message": (
                f"You've applied {total_recent_mm:.1f}mm this week, well above the "
                f"{recommended_mm:.1f}mm the model recommended. Excess water can "
                f"wash out nutrients and stress roots."
            ),
        })

    # --- Sensor staleness ---
    if latest_sensor_reading_at is not None:
        hours_stale = (now - latest_sensor_reading_at).total_seconds() / 3600
        if hours_stale > SENSOR_STALE_THRESHOLD_HOURS:
            if hours_stale < 1:
                time_desc = f"{int(hours_stale * 60)} minutes"
            elif hours_stale < 24:
                time_desc = f"{hours_stale:.0f} hours"
            else:
                time_desc = f"{hours_stale / 24:.0f} days"
            alerts.append({
                "type": "sensor_stale",
                "severity": "medium",
                "icon": "📡",
                "title": "Sensor not reporting",
                "message": (
                    f"Your soil moisture sensor hasn't sent a reading in "
                    f"{time_desc}. Predictions are using an estimate "
                    f"instead — check the sensor's power and connection."
                ),
            })

    # --- Rain expected, skip suggestion ---
    tomorrow_forecast = next(
        (d for d in weather.get("forecast", []) if d.get("expected_rainfall_mm", 0) >= HEAVY_RAIN_THRESHOLD_MM),
        None,
    )
    has_pending_event = any(e.get("day_offset", 99) <= 1 for e in schedule.get("events", []))
    if tomorrow_forecast and has_pending_event:
        alerts.append({
            "type": "rain_expected",
            "severity": "low",
            "icon": "🌧️",
            "title": "Rain expected",
            "message": (
                f"{tomorrow_forecast['expected_rainfall_mm']:.1f}mm of rain is "
                f"forecast soon. Consider skipping or reducing your next scheduled "
                f"irrigation."
            ),
        })

    return alerts
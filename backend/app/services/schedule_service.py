import math
from dataclasses import dataclass

from app.schemas.prediction import PredictionResponse
from app.schemas.weather import WeatherResponse, DailyForecast
from app.schemas.schedule import ScheduleEvent, ScheduleResponse

# --- Tunable agronomy constants -------------------------------------------
# Max depth applied in a single event before runoff/waterlogging risk rises
# for most soil types. Split larger requirements across multiple events
# rather than one large application. Adjust per soil type later if the
# model starts returning soil_type-specific guidance.
MAX_MM_PER_EVENT = 25.0

# Rainfall at or above this amount is treated as meaningfully wetting the
# root zone — that day is skipped as an irrigation day entirely, rather
# than reducing the required amount (keeps the logic auditable: a day is
# either an irrigation day or it isn't).
RAIN_SKIP_THRESHOLD_MM = 4.0

# Early morning minimizes evaporative loss (low temperature, low wind) and
# avoids the prolonged overnight leaf wetness that evening irrigation
# causes, which promotes fungal disease. This is standard guidance
# regardless of crop, so it isn't varied per need-level or season.
TIME_SLOT = "05:30\u201307:00 (early morning)"


@dataclass(frozen=True)
class IrrigationPolicy:
    earliest_start_day: int   # first day scheduling is even allowed to look at
    interval_days: int        # minimum gap between consecutive events
    horizon_days: int         # don't schedule beyond this many days out
    urgency_label: str


NEED_POLICIES: dict[str, IrrigationPolicy] = {
    "high": IrrigationPolicy(
        earliest_start_day=0,
        interval_days=1,
        horizon_days=5,
        urgency_label="Urgent \u2014 begin as soon as possible",
    ),
    "medium": IrrigationPolicy(
        earliest_start_day=1,
        interval_days=2,
        horizon_days=7,
        urgency_label="Moderate \u2014 schedule within the next few days",
    ),
    "low": IrrigationPolicy(
        earliest_start_day=3,
        interval_days=3,
        horizon_days=10,
        urgency_label="Low \u2014 monitor; a light top-up later this week is enough",
    ),
}

DEFAULT_POLICY_KEY = "medium"


def _normalize_need(value: str) -> str:
    return value.strip().lower()


def _event_reason(need_key: str, index: int, total_events: int, day: DailyForecast) -> str:
    if total_events == 1:
        base = {
            "high": "Full requirement applied promptly to relieve water stress.",
            "medium": "Scheduled once the soil moisture trend confirms the need.",
            "low": "Light top-up \u2014 soil moisture is currently adequate.",
        }.get(need_key, "Scheduled irrigation event.")
    else:
        base = (
            f"Split application {index + 1} of {total_events} \u2014 kept at or "
            f"under {MAX_MM_PER_EVENT:.0f}mm to avoid runoff."
        )
    if day.expected_rainfall_mm > 0:
        base += (
            f" Light rain expected ({day.expected_rainfall_mm:.1f}mm) but below "
            f"the {RAIN_SKIP_THRESHOLD_MM:.0f}mm skip threshold."
        )
    return base


def _build_summary(
    policy: IrrigationPolicy,
    events: list[ScheduleEvent],
    unscheduled_mm: float,
    horizon_days: int,
    forecast_len: int,
) -> str:
    if not events:
        return (
            "Could not fit any irrigation events into the available forecast "
            "window \u2014 rain days may be blocking every slot, or the forecast "
            "is too short."
        )
    parts = [f"{len(events)} irrigation event(s) scheduled, starting day {events[0].day_offset}."]
    if unscheduled_mm > 0:
        parts.append(
            f"{unscheduled_mm:.1f}mm could not be scheduled within the "
            f"{horizon_days}-day window; recheck after the next forecast update."
        )
    if forecast_len < policy.horizon_days:
        parts.append(
            f"Forecast only covers {forecast_len} day(s); the schedule may "
            "extend once more data is available."
        )
    return " ".join(parts)


def generate_irrigation_schedule(
    prediction: PredictionResponse,
    weather: WeatherResponse,
) -> ScheduleResponse:
    need_key = _normalize_need(prediction.irrigation_need)
    policy = NEED_POLICIES.get(need_key, NEED_POLICIES[DEFAULT_POLICY_KEY])

    forecast = weather.forecast or []
    horizon_days = min(policy.horizon_days, len(forecast))

    total_mm = round(max(prediction.water_required_mm, 0.0), 1)

    if total_mm == 0 or horizon_days == 0:
        reason = "No water required right now." if total_mm == 0 else "No forecast data available."
        return ScheduleResponse(
            need_level=prediction.irrigation_need,
            confidence=prediction.confidence,
            total_water_required_mm=total_mm,
            scheduled_mm=0.0,
            unscheduled_mm=total_mm,
            events=[],
            summary=f"No irrigation events scheduled. {reason}",
        )

    skip_days = {
        i for i in range(horizon_days)
        if forecast[i].expected_rainfall_mm >= RAIN_SKIP_THRESHOLD_MM
    }

    num_events = max(1, math.ceil(total_mm / MAX_MM_PER_EVENT))

    events: list[ScheduleEvent] = []
    remaining_mm = total_mm
    # Anchor so the very first candidate equals policy.earliest_start_day exactly.
    last_day = policy.earliest_start_day - policy.interval_days
    day_cursor = policy.earliest_start_day

    for i in range(num_events):
        if remaining_mm <= 0:
            break

        candidate = max(day_cursor, last_day + policy.interval_days)
        while candidate < horizon_days and candidate in skip_days:
            candidate += 1

        if candidate >= horizon_days:
            break  # ran out of forecast window — remainder stays unscheduled

        amount = round(min(MAX_MM_PER_EVENT, remaining_mm), 1)
        day = forecast[candidate]

        events.append(
            ScheduleEvent(
                day_offset=candidate,
                date=day.date,
                time_slot=TIME_SLOT,
                water_amount_mm=amount,
                reason=_event_reason(need_key, i, num_events, day),
            )
        )

        remaining_mm = round(remaining_mm - amount, 1)
        last_day = candidate
        day_cursor = candidate + 1

    scheduled_mm = round(total_mm - remaining_mm, 1)
    unscheduled_mm = round(remaining_mm, 1)

    return ScheduleResponse(
        need_level=prediction.irrigation_need,
        confidence=prediction.confidence,
        total_water_required_mm=total_mm,
        scheduled_mm=scheduled_mm,
        unscheduled_mm=unscheduled_mm,
        events=events,
        summary=_build_summary(policy, events, unscheduled_mm, horizon_days, len(forecast)),
    )
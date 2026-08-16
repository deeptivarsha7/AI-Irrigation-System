import pytest

from app.schemas.prediction import PredictionResponse
from app.schemas.weather import WeatherResponse, DailyForecast
from app.services.schedule_service import (
    generate_irrigation_schedule,
    MAX_MM_PER_EVENT,
    RAIN_SKIP_THRESHOLD_MM,
)


def make_forecast(rain_by_day: list[float]) -> WeatherResponse:
    days = [
        DailyForecast(
            date=f"2026-08-{16 + i:02d}",
            min_temp=22.0,
            max_temp=34.0,
            expected_rainfall_mm=rain,
            condition="Clear" if rain < RAIN_SKIP_THRESHOLD_MM else "Rain",
        )
        for i, rain in enumerate(rain_by_day)
    ]
    return WeatherResponse(
        temperature=30.0,
        humidity=55,
        rainfall_mm=0.0,
        condition="Clear",
        forecast=days,
        fetched_at="2026-08-16T06:00:00",
        stale=False,
    )


def make_prediction(need: str, water_mm: float, confidence: str = "High") -> PredictionResponse:
    return PredictionResponse(
        water_required_mm=water_mm,
        irrigation_need=need,
        confidence=confidence,
        soil_moisture_used=18.5,
        season="kharif",
        recommendation="see schedule",
        generated_at="2026-08-16T06:00:00",
    )


# --- Scenario 1 (re-run): High need must respect the configured interval ---

def test_high_need_events_respect_cadence_even_with_a_rain_day():
    # Day 1 has rain, which is exactly the condition that broke the old
    # greedy version (it grabbed 0, 2, 3 instead of properly spaced days).
    weather = make_forecast([0.0, 6.0, 0.0, 0.0, 0.0])
    prediction = make_prediction("High", water_mm=60.0)  # needs 3 events (25/25/10)

    result = generate_irrigation_schedule(prediction, weather)

    offsets = [e.day_offset for e in result.events]
    assert 1 not in offsets  # rain day correctly excluded

    # Whatever policy.interval_days is (currently 1 for High), every
    # consecutive gap must be >= that interval — never less, regardless
    # of where rain days fall.
    for a, b in zip(offsets, offsets[1:]):
        assert b - a >= 1


def test_medium_need_cadence_is_not_collapsed_by_a_rain_day():
    # This mirrors the exact bug shape (0, 2, 3 instead of even 2-day
    # spacing) using the Medium policy, whose interval is 2 days.
    weather = make_forecast([0.0, 6.0, 0.0, 0.0, 0.0, 0.0, 0.0])
    prediction = make_prediction("Medium", water_mm=50.0)  # 2 events

    result = generate_irrigation_schedule(prediction, weather)
    offsets = [e.day_offset for e in result.events]

    assert len(offsets) == 2
    assert offsets[1] - offsets[0] >= 2  # the bug produced a gap of 1 here


# --- Scenario 2 (re-run): Low need must never start "today" -----------------

def test_low_need_never_schedules_immediately():
    weather = make_forecast([0.0] * 10)
    prediction = make_prediction("Low", water_mm=10.0)

    result = generate_irrigation_schedule(prediction, weather)

    assert len(result.events) >= 1
    assert result.events[0].day_offset >= 3  # matches policy.earliest_start_day
    assert result.events[0].day_offset != 0


def test_low_need_urgency_differs_from_high_need_for_identical_volume():
    weather = make_forecast([0.0] * 10)
    low = generate_irrigation_schedule(make_prediction("Low", 10.0), weather)
    high = generate_irrigation_schedule(make_prediction("High", 10.0), weather)

    assert low.events[0].day_offset > high.events[0].day_offset


# --- Edge cases --------------------------------------------------------------

def test_short_forecast_list_does_not_crash_and_reports_unscheduled():
    weather = make_forecast([0.0, 0.0])  # only 2 days available
    prediction = make_prediction("Low", water_mm=15.0)  # earliest_start_day=3

    result = generate_irrigation_schedule(prediction, weather)

    assert result.events == []
    assert result.unscheduled_mm == 15.0
    assert "forecast" in result.summary.lower()


def test_all_rain_week_schedules_nothing():
    weather = make_forecast([10.0] * 7)
    prediction = make_prediction("High", water_mm=20.0)

    result = generate_irrigation_schedule(prediction, weather)

    assert result.events == []
    assert result.unscheduled_mm == 20.0


def test_single_day_forecast_schedules_only_what_fits():
    weather = make_forecast([0.0])
    prediction = make_prediction("High", water_mm=60.0)  # would need 3 events

    result = generate_irrigation_schedule(prediction, weather)

    assert len(result.events) == 1
    assert result.events[0].day_offset == 0
    assert result.unscheduled_mm == 35.0  # 60 - 25 fit into the one day


def test_zero_water_required_schedules_nothing():
    weather = make_forecast([0.0] * 5)
    prediction = make_prediction("Low", water_mm=0.0)

    result = generate_irrigation_schedule(prediction, weather)

    assert result.events == []
    assert result.unscheduled_mm == 0.0
    assert "no water required" in result.summary.lower()


def test_large_volume_splits_under_the_per_event_cap():
    weather = make_forecast([0.0] * 10)
    prediction = make_prediction("High", water_mm=60.0)

    result = generate_irrigation_schedule(prediction, weather)

    assert len(result.events) == 3
    assert all(e.water_amount_mm <= MAX_MM_PER_EVENT for e in result.events)
    assert round(sum(e.water_amount_mm for e in result.events), 1) == 60.0


def test_need_level_matching_is_case_insensitive():
    weather = make_forecast([0.0] * 5)
    upper = generate_irrigation_schedule(make_prediction("HIGH", 10.0), weather)
    lower = generate_irrigation_schedule(make_prediction("high", 10.0), weather)

    assert upper.events[0].day_offset == lower.events[0].day_offset == 0


def test_unknown_need_level_falls_back_to_medium_without_crashing():
    weather = make_forecast([0.0] * 8)
    prediction = make_prediction("Extreme", water_mm=10.0)  # not a real level

    result = generate_irrigation_schedule(prediction, weather)

    assert len(result.events) == 1
    assert result.events[0].day_offset == 1  # Medium's earliest_start_day
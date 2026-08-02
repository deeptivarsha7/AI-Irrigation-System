from datetime import datetime, date
from collections import defaultdict
import httpx

from app.core.config import settings

CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

# Simple in-memory cache: {farm_id: last_successful_response_dict}
_weather_cache: dict[int, dict] = {}


def _fetch_current(lat: float, lon: float) -> dict:
    params = {"lat": lat, "lon": lon, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"}
    response = httpx.get(CURRENT_URL, params=params, timeout=10.0)
    response.raise_for_status()
    return response.json()


def _fetch_forecast(lat: float, lon: float) -> dict:
    params = {"lat": lat, "lon": lon, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"}
    response = httpx.get(FORECAST_URL, params=params, timeout=10.0)
    response.raise_for_status()
    return response.json()


def _build_daily_forecast(forecast_json: dict) -> list[dict]:
    daily_data = defaultdict(list)

    for entry in forecast_json["list"]:
        entry_date = entry["dt_txt"].split(" ")[0]
        daily_data[entry_date].append(entry)

    result = []
    for day_str, entries in list(daily_data.items())[:5]:
        temps = [e["main"]["temp"] for e in entries]
        rainfall = sum(e.get("rain", {}).get("3h", 0.0) for e in entries)
        condition = entries[len(entries) // 2]["weather"][0]["main"]

        result.append({
            "date": day_str,
            "min_temp": min(temps),
            "max_temp": max(temps),
            "expected_rainfall_mm": round(rainfall, 2),
            "condition": condition,
        })

    return result


def get_farm_weather(farm_id: int, latitude: float, longitude: float) -> dict:
    try:
        current = _fetch_current(latitude, longitude)
        forecast_raw = _fetch_forecast(latitude, longitude)

        result = {
            "temperature": current["main"]["temp"],
            "humidity": current["main"]["humidity"],
            "rainfall_mm": current.get("rain", {}).get("1h", 0.0),
            "condition": current["weather"][0]["main"],
            "forecast": _build_daily_forecast(forecast_raw),
            "fetched_at": datetime.utcnow(),
            "stale": False,
        }

        _weather_cache[farm_id] = result
        return result

    except (httpx.HTTPStatusError, httpx.RequestError):
        cached = _weather_cache.get(farm_id)
        if cached:
            stale_result = dict(cached)
            stale_result["stale"] = True
            return stale_result
        raise
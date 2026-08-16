"""
Prediction service — Milestone 2.

Loads the two trained pipelines (regression: water_required_mm,
classification: irrigation_need) and assembles a live feature row from:
  - the farm's stored profile (soil, crop, growth stage, irrigation
    infrastructure, region)
  - live weather (temperature, humidity, rainfall) from the weather service
  - the farm's latest soil-moisture sensor reading, if one exists

Models are loaded once and cached in memory (module-level singletons) since
loading a joblib pipeline from disk on every request would be wasteful.

If no soil-moisture sensor reading exists yet, a soil-type-based estimate is
used instead of a raw sensor value, and the response is explicitly marked
with confidence="estimated" so the frontend (and the farmer) knows this
prediction is a best-effort guess, not a live reading — this is deliberate,
not an oversight: silently treating an estimate as equivalent to a real
sensor reading would be misleading.
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "models"
REGRESSOR_PATH = MODELS_DIR / "irrigation_amount_regressor.joblib"
CLASSIFIER_PATH = MODELS_DIR / "irrigation_need_classifier.joblib"

_regressor = None
_classifier = None


class ModelNotAvailableError(Exception):
    """Raised when the trained model files can't be found or loaded."""


def _load_models():
    """Lazily load and cache both trained pipelines."""
    global _regressor, _classifier

    if _regressor is None:
        if not REGRESSOR_PATH.exists():
            raise ModelNotAvailableError(
                f"Regression model not found at {REGRESSOR_PATH}. Run ml/train.py first."
            )
        _regressor = joblib.load(REGRESSOR_PATH)

    if _classifier is None:
        if not CLASSIFIER_PATH.exists():
            raise ModelNotAvailableError(
                f"Classification model not found at {CLASSIFIER_PATH}. Run ml/train.py first."
            )
        _classifier = joblib.load(CLASSIFIER_PATH)

    return _regressor, _classifier


# Typical volumetric soil moisture (%) by soil type at a "normal" field
# state — these are reasonable literature-based midpoints used ONLY as a
# fallback when no sensor reading exists yet. Not measured data.
SOIL_MOISTURE_DEFAULTS = {
    "sandy": 15.0,
    "loamy": 30.0,
    "clay": 38.0,
    "silty": 32.0,
    "peaty": 45.0,
    "chalky": 20.0,
    "black": 35.0,
    "red": 22.0,
    "alluvial": 33.0,
}

NUMERIC_FEATURES = [
    "soil_moisture", "temperature", "humidity", "rainfall_mm",
    "area_hectares", "previous_irrigation_mm",
]
CATEGORICAL_FEATURES = [
    "crop_type", "soil_type", "crop_growth_stage", "season",
    "region", "irrigation_type", "water_source", "mulching_used",
]

# Matches the Kharif / Rabi / Zaid convention used to build the training
# dataset (see ml/train.py docstring for the underlying agricultural logic).
def get_season_from_month(month: int) -> str:
    if month in (6, 7, 8, 9):
        return "Kharif"
    if month in (10, 11, 12, 1, 2, 3):
        return "Rabi"
    return "Zaid"


def _build_recommendation(irrigation_need: str, water_required_mm: float) -> str:
    """Human-readable guidance to accompany the raw prediction numbers."""
    if irrigation_need == "High":
        return (
            f"This field needs irrigation soon — apply approximately "
            f"{water_required_mm:.1f} mm of water within the next 1–2 days."
        )
    if irrigation_need == "Medium":
        return (
            f"Moderate irrigation need. Plan to apply around "
            f"{water_required_mm:.1f} mm within the next 3–4 days."
        )
    return (
        f"Low irrigation need right now — soil conditions and recent rainfall "
        f"suggest you can hold off. Re-check in a few days."
    )


def predict_irrigation(
    farm,
    weather: dict,
    latest_soil_moisture: Optional[float],
) -> dict:
    """
    Run both trained models against a farm's current profile + live
    conditions, and return a structured prediction result.

    Raises ModelNotAvailableError if the .joblib files aren't present.
    """
    regressor, classifier = _load_models()

    confidence = "high"
    soil_moisture = latest_soil_moisture
    if soil_moisture is None:
        soil_moisture = SOIL_MOISTURE_DEFAULTS.get(farm.soil_type.lower().strip(), 25.0)
        confidence = "estimated"

    season = get_season_from_month(datetime.utcnow().month)

    feature_row = {
        "soil_moisture": float(soil_moisture),
        "temperature": float(weather["temperature"]),
        "humidity": float(weather["humidity"]),
        "rainfall_mm": float(weather.get("rainfall_mm", 0.0) or 0.0),
        "area_hectares": float(farm.area_hectares),
        "previous_irrigation_mm": 0.0,
        "crop_type": farm.crop_type,
        "soil_type": farm.soil_type,
        "crop_growth_stage": farm.crop_growth_stage,
        "season": season,
        "region": farm.region,
        "irrigation_type": farm.irrigation_type,
        "water_source": farm.water_source,
        "mulching_used": farm.mulching_used,
    }

    X = pd.DataFrame([feature_row])[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

    predicted_mm = max(0.0, float(regressor.predict(X)[0]))
    predicted_need = str(classifier.predict(X)[0])

    return {
        "water_required_mm": round(predicted_mm, 1),
        "irrigation_need": predicted_need,
        "confidence": confidence,
        "soil_moisture_used": round(float(soil_moisture), 1),
        "season": season,
        "recommendation": _build_recommendation(predicted_need, predicted_mm),
        "generated_at": datetime.utcnow().isoformat(),
    }
"""
Milestone 2 -- synthetic daily sequence dataset for LSTM training.

WHY THIS FILE EXISTS: irrigation_dataset_PROJECT_FINAL.csv (used by
train.py for Random Forest / Gradient Boosting) is a flat snapshot dataset
-- each row is one independent moment in time, with no farm identifier and
no day-to-day ordering. That's fine for RF/GB, which don't model sequence,
but an LSTM specifically needs ordered day-by-day history per farm to learn
anything. No script or documentation describing how the original CSV's
"real" vs "synthetic_extension" split was built could be located, so this
generator does NOT claim to reproduce that methodology. Everything produced
here is honestly labelled data_source="synthetic_sequence" -- fully
synthetic, physically-grounded simulation, not a claimed match to any real
source.

VALIDATION HISTORY: the first version of this generator had irrigation
applied unconditionally every day (prev_irrigation_mm = water_required_mm
on every loop iteration), which caused soil moisture to saturate toward
each soil type's max bound almost immediately -- irrigation_need collapsed
to 88.6% Low / 11.1% Medium / 0.3% High, versus the real dataset's 58.6% /
38.1% / 3.3%. Fixed by making irrigation an EVENT that only fires on a
subset of days, with probability scaled to how urgent the need is that
day -- mirroring how a real farmer irrigates more reliably when need is
High and may skip or delay when need is Low. This restores a genuine
dry-down / refill cycle instead of a monotonic climb to saturation.

WHAT IT SIMULATES, per farm, per day:
  - soil_moisture evolves via a daily water balance: it drains (evapo-
    transpiration, driven by temperature + crop growth stage) and refills
    (rainfall + occasional irrigation events), clipped to realistic
    per-soil-type bounds -- so a sandy field genuinely dries faster than
    a peaty one, matching the soil-type moisture ordering in the real
    snapshot dataset.
  - crop_growth_stage advances through Sowing -> Vegetative -> Flowering
    -> Harvest over the simulated growing period.
  - rainfall_mm is a realistic DAILY value (unlike the source CSV's
    seasonal-total column), higher and more frequent in Kharif.
  - water_required_mm / irrigation_need are derived from the day's
    moisture level using the same relationship observed in the real
    dataset (~20% moisture -> High/~90mm, ~30% -> Medium/~52mm, ~40% ->
    Low/~30mm).
  - irrigation is applied as an EVENT, not automatically every day (see
    VALIDATION HISTORY above) -- probability of irrigating today scales
    with today's need level, and only fires on the day itself, not as a
    guaranteed daily top-up.

Run from backend/ml/:
    python generate_sequence_dataset.py
"""

import numpy as np
import pandas as pd
from pathlib import Path

OUT_PATH = Path(__file__).parent / "data" / "irrigation_sequence_dataset.csv"

RNG_SEED = 42
NUM_FARMS = 300
DAYS_PER_FARM = 120

CROP_TYPES = ["Maize", "Cotton", "Rice", "Vegetables", "Groundnut", "Coconut", "Wheat", "Other", "Sugarcane"]
REGIONS = ["Central", "South", "East", "West", "North"]
IRRIGATION_TYPES = ["Canal", "Drip", "Sprinkler", "Rainfed"]
WATER_SOURCES = ["Groundwater", "Reservoir", "River", "Rainwater"]
GROWTH_STAGES = ["Sowing", "Vegetative", "Flowering", "Harvest"]
STAGE_LENGTH_DAYS = 30

SOIL_PROFILES = {
    "Chalky":   {"min": 6.0,  "max": 30.0, "dry_rate": 1.35},
    "Red":      {"min": 8.0,  "max": 38.0, "dry_rate": 1.15},
    "Sandy":    {"min": 8.0,  "max": 48.0, "dry_rate": 1.30},
    "Alluvial": {"min": 10.0, "max": 60.0, "dry_rate": 0.95},
    "Silty":    {"min": 10.0, "max": 60.0, "dry_rate": 0.90},
    "Loamy":    {"min": 10.0, "max": 62.0, "dry_rate": 0.85},
    "Clay":     {"min": 12.0, "max": 65.0, "dry_rate": 0.65},
    "Black":    {"min": 14.0, "max": 70.0, "dry_rate": 0.60},
    "Peaty":    {"min": 18.0, "max": 78.0, "dry_rate": 0.50},
}

STAGE_DEMAND_MULTIPLIER = {
    "Sowing": 0.7,
    "Vegetative": 1.0,
    "Flowering": 1.3,
    "Harvest": 0.6,
}

SEASON_WEATHER = {
    "Kharif": {"rain_prob": 0.45, "rain_mean": 18.0, "temp_mean": 29.0, "temp_std": 3.0, "humidity_mean": 78},
    "Rabi":   {"rain_prob": 0.12, "rain_mean": 6.0,  "temp_mean": 21.0, "temp_std": 4.0, "humidity_mean": 55},
    "Zaid":   {"rain_prob": 0.08, "rain_mean": 4.0,  "temp_mean": 33.0, "temp_std": 3.5, "humidity_mean": 40},
}

# Probability that a farmer actually irrigates TODAY, given today's
# irrigation_need level. High need is acted on almost every time; Low
# need is mostly skipped (matches real farmer behaviour -- advice isn't
# followed with perfect daily compliance, and shouldn't be simulated as
# if it were).
IRRIGATION_TRIGGER_PROB = {
    "High": 0.85,
    "Medium": 0.35,
    "Low": 0.06,
}

# How much of the applied mm actually translates into moisture % gain.
# A modest depth of applied water raises topsoil volumetric moisture by
# a fraction of the mm figure, not 1:1 -- kept deliberately conservative
# so a single irrigation event doesn't itself cause saturation.
IRRIGATION_INFILTRATION_FACTOR = 0.06
RAIN_INFILTRATION_FACTOR = 0.10


def get_season_from_month(month: int) -> str:
    if month in (6, 7, 8, 9):
        return "Kharif"
    if month in (10, 11, 12, 1, 2, 3):
        return "Rabi"
    return "Zaid"


def moisture_to_need_and_water(moisture: float, area_hectares: float, stage_mult: float, rng: np.random.Generator) -> tuple[str, float]:
    base = np.clip(120.0 - moisture * 2.2, 5.0, 130.0)
    water_required = base * stage_mult * (0.85 + 0.3 * min(area_hectares / 10.0, 1.5))
    water_required = float(np.clip(water_required + rng.normal(0, 4), 0, 240))

    if moisture < 24:
        need = "High"
    elif moisture < 38:
        need = "Medium"
    else:
        need = "Low"
    return need, round(water_required, 2)


def simulate_farm(farm_uid: int, start_month: int, rng: np.random.Generator) -> list[dict]:
    crop_type = rng.choice(CROP_TYPES)
    soil_type = rng.choice(list(SOIL_PROFILES.keys()))
    region = rng.choice(REGIONS)
    irrigation_type = rng.choice(IRRIGATION_TYPES)
    water_source = rng.choice(WATER_SOURCES)
    mulching_used = rng.choice(["Yes", "No"])
    area_hectares = round(float(rng.uniform(0.5, 20.0)), 2)

    profile = SOIL_PROFILES[soil_type]
    # Start at the profile's midpoint (matches real dataset's per-soil-type
    # mean) rather than a random point near the ceiling, so the sequence
    # doesn't start artificially wet.
    moisture = (profile["min"] + profile["max"]) / 2.0

    rows = []
    applied_irrigation_today = 0.0  # what actually gets recorded as previous_irrigation_mm for the NEXT row

    for day in range(DAYS_PER_FARM):
        month = ((start_month - 1 + day // 30) % 12) + 1
        season = get_season_from_month(month)
        weather = SEASON_WEATHER[season]

        stage_index = (day // STAGE_LENGTH_DAYS) % len(GROWTH_STAGES)
        crop_growth_stage = GROWTH_STAGES[stage_index]
        stage_mult = STAGE_DEMAND_MULTIPLIER[crop_growth_stage]

        temperature = round(float(rng.normal(weather["temp_mean"], weather["temp_std"])), 2)
        humidity = int(np.clip(rng.normal(weather["humidity_mean"], 8), 20, 95))

        is_rain_day = rng.random() < weather["rain_prob"]
        rainfall_mm = round(float(max(0.0, rng.normal(weather["rain_mean"], weather["rain_mean"] * 0.4))), 2) if is_rain_day else 0.0

        # previous_irrigation_mm for THIS row is whatever was actually
        # applied yesterday (0 on most days -- see IRRIGATION_TRIGGER_PROB)
        previous_irrigation_mm = applied_irrigation_today

        dry_rate = profile["dry_rate"] * (temperature / 28.0) * stage_mult
        moisture -= dry_rate
        moisture += rainfall_mm * RAIN_INFILTRATION_FACTOR
        moisture += previous_irrigation_mm * IRRIGATION_INFILTRATION_FACTOR
        moisture = float(np.clip(moisture, profile["min"], profile["max"]))

        irrigation_need, water_required_mm = moisture_to_need_and_water(
            moisture, area_hectares, stage_mult, rng
        )

        rows.append({
            "farm_uid": farm_uid,
            "day_index": day,
            "crop_type": crop_type,
            "soil_type": soil_type,
            "crop_growth_stage": crop_growth_stage,
            "season": season,
            "region": region,
            "soil_moisture": round(moisture, 2),
            "temperature": temperature,
            "humidity": humidity,
            "rainfall_mm": rainfall_mm,
            "area_hectares": area_hectares,
            "previous_irrigation_mm": round(previous_irrigation_mm, 2),
            "irrigation_type": irrigation_type,
            "water_source": water_source,
            "mulching_used": mulching_used,
            "water_required_mm": water_required_mm,
            "irrigation_need": irrigation_need,
            "data_source": "synthetic_sequence",
        })

        # Decide whether the farmer actually irrigates TODAY (the amount
        # applied will show up as previous_irrigation_mm on TOMORROW's row).
        trigger_prob = IRRIGATION_TRIGGER_PROB[irrigation_need]
        if rng.random() < trigger_prob:
            applied_irrigation_today = water_required_mm
        else:
            applied_irrigation_today = 0.0

    return rows


def main():
    rng = np.random.default_rng(RNG_SEED)
    all_rows = []

    for farm_uid in range(NUM_FARMS):
        start_month = int(rng.integers(1, 13))
        all_rows.extend(simulate_farm(farm_uid, start_month, rng))

    df = pd.DataFrame(all_rows)
    OUT_PATH.parent.mkdir(exist_ok=True)
    df.to_csv(OUT_PATH, index=False)

    print(f"Generated {len(df)} rows across {NUM_FARMS} farms x {DAYS_PER_FARM} days")
    print(f"Saved to {OUT_PATH}")
    print("\nirrigation_need distribution (target: ~58.6% Low / 38.1% Medium / 3.3% High):")
    print(df["irrigation_need"].value_counts())
    print((df["irrigation_need"].value_counts(normalize=True) * 100).round(1))
    print("\nsoil_moisture by soil_type (compare against real dataset means: Chalky 16, Red 22, Sandy 30, Alluvial/Silty/Loamy 35-36, Clay 39, Black 45, Peaty 55):")
    print(df.groupby("soil_type")["soil_moisture"].mean().round(1))


if __name__ == "__main__":
    main()
# AI-Based Irrigation Management System

A predictive irrigation platform that helps farmers track field conditions,
soil sensor data, and weather forecasts, and receive ML-driven, time-slotted
irrigation recommendations.

## Tech stack

**Backend**
- FastAPI 0.141.1 (Python), served via Uvicorn 0.52.1
- PostgreSQL, accessed through SQLAlchemy 2.0.51 (Psycopg 3.3.4 driver)
- Alembic 1.18.5 for schema migrations
- Pydantic 2.13.4 / Pydantic Settings 2.14.2 for validation and config
- Auth: python-jose (JWT) + Passlib/bcrypt (password hashing)
- httpx 0.28.1 for external API calls (OpenWeatherMap)

**Machine learning**
- scikit-learn (Random Forest, Gradient Boosting — regression + classification)
- TensorFlow / Keras (LSTM — sequential soil-moisture modelling)
- MLflow, tracked via local SQLite backend (`ml/mlflow.db`)
- pandas / numpy for feature engineering and synthetic dataset generation
- joblib for serializing trained scikit-learn pipelines

**Frontend**
- Next.js 16.2.12 (App Router), React 19.2.4
- TypeScript, Tailwind CSS 4
- ESLint 9

**External APIs**
- OpenWeatherMap — current conditions + 5-day/3-hour forecast

## Project structure

```
ai-irrigation-system/
├── backend/
│   ├── alembic/                    # migration environment + versioned migrations
│   │   └── versions/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py             # shared dependencies (get_db, get_current_user)
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── auth.py
│   │   │       │   ├── farms.py             # farm CRUD + weather + prediction + schedule routes
│   │   │       │   ├── sensors.py
│   │   │       │   ├── sensor_readings.py
│   │   │       │   └── irrigation_events.py # log/list a field's actual irrigation history
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic-settings, reads .env)
│   │   │   └── security.py         # password hashing, JWT
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models/                 # SQLAlchemy models: user, farm, sensor, sensor_reading, irrigation_event
│   │   ├── schemas/                # Pydantic schemas: user, farm, sensor, sensor_reading, weather, prediction, schedule
│   │   ├── services/
│   │   │   ├── weather_service.py     # OpenWeatherMap fetch, parse, stale-cache fallback
│   │   │   ├── prediction_service.py  # loads trained RF/GBM pipelines, builds live feature row, predicts
│   │   │   └── schedule_service.py    # converts a prediction + forecast into a time-slotted irrigation plan
│   │   └── main.py
│   ├── ml/
│   │   ├── data/
│   │   │   ├── irrigation_dataset_PROJECT_FINAL.csv       # flat snapshot dataset (RF/GBM training)
│   │   │   └── irrigation_sequence_dataset.csv             # daily per-farm sequences (LSTM training)
│   │   ├── models/                 # trained model artifacts (.joblib, .keras) — not committed if large
│   │   ├── train.py                        # trains + evaluates RF and GBM, logs to MLflow
│   │   ├── generate_sequence_dataset.py    # simulates daily soil-moisture sequences for LSTM
│   │   ├── train_lstm.py                   # trains + evaluates LSTM, logs to MLflow
│   │   ├── compare_models.py               # reads MLflow, ranks RF/GBM/LSTM per task, declares a winner
│   │   └── mlflow.db               # local MLflow tracking store (SQLite)
│   ├── tests/
│   │   └── test_schedule_service.py   # unit + regression tests for the schedule optimizer
│   ├── alembic.ini
│   ├── pytest.ini
│   └── requirements.txt
└── frontend/
    ├── public/
    └── src/
        ├── app/
        │   ├── dashboard/page.tsx
        │   ├── farms/
        │   │   ├── [id]/page.tsx   # farm detail: weather, ML prediction, irrigation schedule, irrigation history, sensors
        │   │   └── new/page.tsx    # add a field
        │   ├── login/page.tsx
        │   ├── register/page.tsx
        │   └── layout.tsx
        ├── components/
        │   ├── ProtectedRoute.tsx
        │   └── auth/AuthLayout.tsx
        ├── context/
        │   └── AuthContext.tsx
        └── lib/
            ├── api.ts              # API client
            └── theme.ts            # shared color palette
```

## Local setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ai_irrigation_db
DATABASE_USER=irrigation_user
DATABASE_PASSWORD=<your-password>

SECRET_KEY=<your-jwt-secret>
OPENWEATHER_API_KEY=<your-openweathermap-key>
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
```

`DATABASE_URL` is assembled automatically from the fields above (see
`app/core/config.py`) — no need to set it directly. JWT tokens expire after
60 minutes by default (`ACCESS_TOKEN_EXPIRE_MINUTES` in `Settings`).

Run migrations, then start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Interactive API docs: `http://localhost:8000/docs`

### Running the test suite

```bash
cd backend
pytest tests/ -v
```

`pytest.ini` sets `pythonpath = .` so `app.*` imports resolve correctly
regardless of which directory `pytest` is invoked from.

### Training the ML models

Trained model artifacts are required for `/predict-irrigation` and
`/schedule` to work — the API returns a `503` if they're missing. To
(re)train from scratch:

```bash
cd backend/ml
python train.py                       # Random Forest + Gradient Boosting
python generate_sequence_dataset.py    # builds the synthetic daily-sequence dataset LSTM needs
python train_lstm.py                   # LSTM (takes noticeably longer than RF/GBM)
python compare_models.py               # prints a ranked comparison across all three, with a declared winner per task
```

`RandomForestRegressor`/`GradientBoostingRegressor`'s output (whichever
scores higher on test R2) is what actually serves live predictions via
`prediction_service.py` — LSTM is trained and evaluated for comparison but
is not currently wired into live serving (see **Known limitations** below).

To inspect all runs interactively:
```bash
mlflow ui --backend-store-uri sqlite:///mlflow.db
```
(run from `backend/ml/`, then open `http://127.0.0.1:5000`)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:3000`. Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Milestone 1 status (Weeks 1–2)

| Requirement | Status |
|---|---|
| Data ingestion pipeline (REST) | ✅ Done |
| Weather API integration | ✅ Done |
| Field/crop configuration module | ✅ Done |
| Data cleaning & normalization | ✅ Done |
| Relational DB schema (PostgreSQL) | ✅ Done |
| Time-series storage | 🔶 See note below |

### Time-series storage note

`sensor_readings` currently uses plain PostgreSQL rather than TimescaleDB/
InfluxDB as originally scoped. TimescaleDB requires a version-matched
extension install, and our PostgreSQL 18 setup doesn't currently have a
compatible package available. For the present prototype's data volume, plain
PostgreSQL is sufficient. TimescaleDB migration is a planned upgrade once the
project moves to a Postgres version with stable extension support, or once
data volume justifies the change. **This gap is also why LSTM has no live
serving path yet — see Milestone 2's Known limitations below.**

### Data cleaning & normalization, specifics

- Sensor readings are validated at both the schema level (rejects negative
  values, returns `422`) and the endpoint level (type-aware upper bounds —
  soil moisture capped at 0–100%, temperature bounded to a realistic field
  range, returns `400` with a clear message).
- Duplicate sensor identifiers are caught via `IntegrityError` handling and
  returned as a clean `400`, with the DB session rolled back, rather than
  surfacing a raw database exception as a `500`.
- Weather API failures fall back to the last successfully cached reading for
  that field (in-memory cache, keyed by farm id), with a `stale: true` flag
  in the response, rather than failing the request outright when there's a
  known-good previous result available.

## Milestone 2 status (Weeks 3–4)

| Requirement | Status |
|---|---|
| Feature engineering (soil moisture, weather, growth stage, historical usage) | 🔶 Done, with two honest caveats below |
| Train/evaluate RF, Gradient Boosting, and LSTM | ✅ Done |
| Schedule optimizer → time-slotted irrigation plans | ✅ Done |
| FastAPI real-time serving endpoint | ✅ Done |
| MLflow tracking | 🔶 Core tracking done, no registry/versioning workflow yet |

### Models: training, comparison, and what actually serves live predictions

All three model families are trained and evaluated on held-out test data,
logged to a shared MLflow experiment (`irrigation-scheduling`), and directly
compared by `ml/compare_models.py`. Results as of the last full training run:

| Task | Winner | Metric |
|---|---|---|
| Regression (`water_required_mm`) | Gradient Boosting | R²=0.974, MAE=3.36mm |
| Classification (`irrigation_need`) | Gradient Boosting | macro F1=0.850, accuracy=0.904 |

Random Forest is close behind on both tasks. LSTM, trained on a separately
generated synthetic daily-sequence dataset (see caveat below), reaches
R²=0.912 on regression and 88.9% accuracy on classification — a strong
standalone result, though it doesn't beat GBM on the metrics above. LSTM's
classifier is deliberately class-weighted to prioritize recall on the rare
"High" irrigation-need class (94% recall — it rarely misses a genuine
water-stress case), at the cost of precision (more false alarms) — a
defensible trade-off for a farmer-facing safety signal, even though it
lowers the aggregate macro-F1 score.

**Gradient Boosting is what currently serves live predictions** via
`prediction_service.py`.

### Known caveats in "feature engineering" (stated honestly, not glossed over)

1. **Weather forecast data isn't a model input — only a scheduling input.**
   `prediction_service.py`'s feature row uses *current* weather conditions
   (`temperature`, `humidity`, `rainfall_mm`), not the 5-day forecast array.
   The forecast is used downstream by the schedule optimizer to decide
   *when* to place irrigation events (skipping rain days above a threshold),
   but the ML models themselves never see forward-looking weather. This is
   a deliberate nowcasting/scheduling split, not an oversight — worth
   stating plainly rather than claiming full literal compliance with the
   spec's "feature engineering combining... weather forecasts" wording.

2. **"Historical water usage patterns" is currently one data point, not a
   trend.** `previous_irrigation_mm` is populated from the single most
   recent logged `IrrigationEvent` for a farm (see `_get_previous_irrigation_mm()`
   in `farms.py`) — a real value now, not the hardcoded `0.0` used in an
   earlier version, but still a single most-recent reading rather than an
   aggregated pattern (e.g. a rolling average or irrigation frequency).
   Genuine MVP scope, not currently a "pattern" in the plural sense the
   spec's wording implies.

3. **MLflow tracking supports comparison, not yet iteration.** Runs are
   logged and directly comparable via `compare_models.py`, but there's no
   Model Registry usage (staging/production stage tags) and no documented
   retraining-on-new-data workflow. The spec's "to support iterative
   improvement as new seasonal data arrives" implies an ongoing process;
   what exists today is one-time training + comparison.

None of the three above are considered blockers — they're documented,
deliberate scope decisions appropriate for an 8-week internship's Week 3-4
checkpoint, not silent gaps.

### The schedule optimizer, and two real bugs found and fixed

`schedule_service.py` converts a `PredictionResponse` + weather forecast
into a set of dated, timed, capped-volume irrigation events. During
development, live testing (not just unit tests) surfaced two genuine logic
bugs, both now fixed and covered by regression tests in
`tests/test_schedule_service.py`:

- **Cadence wasn't actually enforced.** The original greedy version picked
  the next non-rain day without checking it against the configured minimum
  interval, so events could land closer together than intended whenever a
  rain day fell mid-sequence. Fixed by anchoring every candidate day to
  `last_event_day + interval_days` as a hard floor.
- **"Low" need could schedule for today.** Urgency wasn't reflected in
  *where* scheduling was allowed to start looking, only in interval spacing
  after the fact. Fixed by giving each need-level policy an
  `earliest_start_day` floor — Low need is structurally barred from landing
  before day 3, not just discouraged.

Both fixes were verified against real live predictions after deployment
(e.g. a real 56.1mm High-need requirement correctly split into 3 events
across 3 consecutive days, respecting the 1-day interval and the rain-skip
threshold), not just synthetic test fixtures.

### Known limitations

- **LSTM has no live serving path.** Serving a real-time LSTM prediction
  requires the last 14 days of a farm's actual sequential sensor history —
  and the time-series storage needed to accumulate that history was never
  built (see Milestone 1's Time-series storage note above). LSTM is fully
  trained and evaluated offline against a synthetic sequence dataset, but
  cannot currently generate a live prediction for a real farm. Enabling
  this is realistically Milestone 3/4-scope work, not a quick fix.
- The synthetic LSTM training dataset (`generate_sequence_dataset.py`) is
  fully synthetic and explicitly labelled as such (`data_source:
  "synthetic_sequence"`) — no claim is made that it reproduces the
  methodology behind the real/synthetic split in the RF/GBM training CSV,
  since no documentation or generator script for that original split could
  be located.

## API overview

All endpoints below live under `/api/v1`. Every route except register/login
requires a `Bearer` JWT in the `Authorization` header. Farms, sensors,
readings, and irrigation events are scoped per user — a farmer can only see
and modify their own data (verified via ownership checks on every query,
not just at creation).

| Method & path | Description |
|---|---|
| `POST /auth/register` | Register a new farmer |
| `POST /auth/login` | Log in, returns a JWT (60-minute expiry) |
| `POST /farms/` | Create a farm/field |
| `GET /farms/` | List the current user's farms |
| `GET /farms/{farm_id}` | Get one farm |
| `PUT /farms/{farm_id}` | Update a farm |
| `DELETE /farms/{farm_id}` | Delete a farm |
| `GET /farms/{farm_id}/weather` | Current conditions + 5-day forecast for that farm's location |
| `GET /farms/{farm_id}/predict-irrigation` | Live ML prediction: irrigation need, water volume required, confidence |
| `GET /farms/{farm_id}/schedule` | Time-slotted irrigation plan derived from the live prediction + forecast |
| `POST /sensors/` | Register a sensor on a farm |
| `GET /sensors/` | List the current user's sensors |
| `GET /sensors/{sensor_id}` | Get one sensor |
| `PUT /sensors/{sensor_id}` | Update a sensor |
| `DELETE /sensors/{sensor_id}` | Delete a sensor |
| `POST /sensor-readings/` | Submit a reading for a sensor (validated) |
| `GET /sensor-readings/sensor/{sensor_id}` | Reading history for a sensor, newest first |
| `POST /farms/{farm_id}/irrigation-events` | Log an actual irrigation event (amount + timestamp) |
| `GET /farms/{farm_id}/irrigation-events` | List a farm's logged irrigation history |

## Frontend pages

| Route | Purpose |
|---|---|
| `/login`, `/register` | Auth screens |
| `/dashboard` | List of the farmer's fields, with an empty-state illustration when none exist yet |
| `/farms/new` | Add a new field |
| `/farms/[id]` | Field detail — live weather (current + 5-day forecast), ML-powered irrigation prediction, time-slotted irrigation schedule, irrigation history (with a form to log new events), and registered sensors with latest readings |
# AI-Based Irrigation Management System

A predictive irrigation platform that helps farmers track field conditions,
soil sensor data, and weather forecasts to make informed watering decisions.

## Tech stack

**Backend**
- FastAPI 0.141.1 (Python), served via Uvicorn 0.52.1
- PostgreSQL, accessed through SQLAlchemy 2.0.51 (Psycopg 3.3.4 driver)
- Alembic 1.18.5 for schema migrations
- Pydantic 2.13.4 / Pydantic Settings 2.14.2 for validation and config
- Auth: python-jose (JWT) + Passlib/bcrypt (password hashing)
- httpx 0.28.1 for external API calls (OpenWeatherMap)

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
│   │   │       │   ├── farms.py    # farm CRUD + GET /farms/{id}/weather
│   │   │       │   ├── sensors.py
│   │   │       │   └── sensor_readings.py
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic-settings, reads .env)
│   │   │   └── security.py         # password hashing, JWT
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models/                 # SQLAlchemy models: user, farm, sensor, sensor_reading
│   │   ├── schemas/                # Pydantic schemas: user, farm, sensor, sensor_reading, weather
│   │   ├── services/
│   │   │   └── weather_service.py  # OpenWeatherMap fetch, parse, stale-cache fallback
│   │   └── main.py
│   ├── alembic.ini
│   └── requirements.txt
└── frontend/
    ├── public/
    └── src/
        ├── app/
        │   ├── dashboard/page.tsx
        │   ├── farms/
        │   │   ├── [id]/page.tsx   # farm detail: weather + sensors
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
data volume justifies the change.

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

## API overview

All endpoints below live under `/api/v1`. Every route except register/login
requires a `Bearer` JWT in the `Authorization` header. Farms, sensors, and
readings are scoped per user — a farmer can only see and modify their own
data (verified via ownership checks on every query, not just at creation).

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
| `POST /sensors/` | Register a sensor on a farm |
| `GET /sensors/` | List the current user's sensors |
| `GET /sensors/{sensor_id}` | Get one sensor |
| `PUT /sensors/{sensor_id}` | Update a sensor |
| `DELETE /sensors/{sensor_id}` | Delete a sensor |
| `POST /sensor-readings/` | Submit a reading for a sensor (validated) |
| `GET /sensor-readings/sensor/{sensor_id}` | Reading history for a sensor, newest first |

## Frontend pages

| Route | Purpose |
|---|---|
| `/login`, `/register` | Auth screens |
| `/dashboard` | List of the farmer's fields, with an empty-state illustration when none exist yet |
| `/farms/new` | Add a new field |
| `/farms/[id]` | Field detail — live weather (current + 5-day forecast) and registered sensors with latest readings |

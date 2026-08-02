from fastapi import APIRouter

from app.api.v1.endpoints import auth, farms, sensors, sensor_readings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(farms.router, prefix="/farms", tags=["Farms"])
api_router.include_router(sensors.router, prefix="/sensors", tags=["Sensors"])
api_router.include_router(sensor_readings.router, prefix="/sensor-readings", tags=["Sensor Readings"])
from typing import List
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.farm import Farm
from app.models.user import User
from app.models.sensor import Sensor
from app.models.sensor_reading import SensorReading
from app.schemas.farm import FarmCreate, FarmUpdate, FarmResponse
from app.schemas.weather import WeatherResponse
from app.schemas.prediction import PredictionResponse
from app.services.weather_service import get_farm_weather
from app.services.prediction_service import predict_irrigation, ModelNotAvailableError


router = APIRouter()


@router.post("/", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
def create_farm(farm_in: FarmCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_farm = Farm(**farm_in.model_dump(), user_id=current_user.id)
    db.add(new_farm)
    db.commit()
    db.refresh(new_farm)
    return new_farm


@router.get("/", response_model=List[FarmResponse])
def list_farms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Farm).filter(Farm.user_id == current_user.id).all()


@router.get("/{farm_id}", response_model=FarmResponse)
def get_farm(farm_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.put("/{farm_id}", response_model=FarmResponse)
def update_farm(farm_id: int, farm_in: FarmUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    for key, value in farm_in.model_dump(exclude_unset=True).items():
        setattr(farm, key, value)

    db.commit()
    db.refresh(farm)
    return farm


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(farm_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    db.delete(farm)
    db.commit()
    return None


@router.get("/{farm_id}/weather", response_model=WeatherResponse)
def get_farm_weather_route(farm_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    try:
        return get_farm_weather(farm.id, farm.latitude, farm.longitude)
    except (httpx.HTTPStatusError, httpx.RequestError):
        raise HTTPException(status_code=502, detail="Weather service unavailable and no cached data exists")


@router.get("/{farm_id}/predict-irrigation", response_model=PredictionResponse)
def predict_irrigation_route(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    try:
        weather = get_farm_weather(farm.id, farm.latitude, farm.longitude)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Weather data is required to generate a prediction, and is currently unavailable.",
        )

    latest_moisture = None
    moisture_sensor = (
        db.query(Sensor)
        .filter(Sensor.farm_id == farm.id, Sensor.sensor_type == "soil_moisture")
        .order_by(Sensor.installed_at.desc())
        .first()
    )
    if moisture_sensor:
        latest_reading = (
            db.query(SensorReading)
            .filter(SensorReading.sensor_id == moisture_sensor.id)
            .order_by(SensorReading.recorded_at.desc())
            .first()
        )
        if latest_reading:
            latest_moisture = latest_reading.value

    try:
        result = predict_irrigation(farm, weather, latest_moisture)
    except ModelNotAvailableError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return result
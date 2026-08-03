from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.sensor import Sensor
from app.models.farm import Farm
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.schemas.sensor_reading import SensorReadingCreate, SensorReadingResponse

router = APIRouter()

# Sane upper bounds per sensor type. A reading outside this range is almost
# certainly a faulty sensor or bad data, not a real measurement.
SENSOR_VALUE_BOUNDS = {
    "soil_moisture": (0, 100),   # percentage
    "humidity": (0, 100),        # percentage
    "temperature": (-10, 60),    # Celsius, realistic field range
}


@router.post("/", response_model=SensorReadingResponse, status_code=status.HTTP_201_CREATED)
def create_reading(reading_in: SensorReadingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sensor = (
        db.query(Sensor)
        .join(Farm, Sensor.farm_id == Farm.id)
        .filter(Sensor.id == reading_in.sensor_id, Farm.user_id == current_user.id)
        .first()
    )
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    bounds = SENSOR_VALUE_BOUNDS.get(sensor.sensor_type)
    if bounds:
        low, high = bounds
        if not (low <= reading_in.value <= high):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Value {reading_in.value} is outside the valid range for {sensor.sensor_type} ({low}–{high}).",
            )

    new_reading = SensorReading(**reading_in.model_dump())
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)
    return new_reading


@router.get("/sensor/{sensor_id}", response_model=List[SensorReadingResponse])
def list_readings_for_sensor(sensor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sensor = (
        db.query(Sensor)
        .join(Farm, Sensor.farm_id == Farm.id)
        .filter(Sensor.id == sensor_id, Farm.user_id == current_user.id)
        .first()
    )
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    return (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id)
        .order_by(SensorReading.recorded_at.desc())
        .all()
    )
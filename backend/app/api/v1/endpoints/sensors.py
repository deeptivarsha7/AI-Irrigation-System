from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.sensor import Sensor
from app.models.farm import Farm
from app.models.user import User
from app.schemas.sensor import SensorCreate, SensorUpdate, SensorResponse

router = APIRouter()


def _verify_farm_ownership(db: Session, farm_id: int, user_id: int) -> Farm:
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or does not belong to you")
    return farm


@router.post("/", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
def create_sensor(sensor_in: SensorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _verify_farm_ownership(db, sensor_in.farm_id, current_user.id)

    new_sensor = Sensor(**sensor_in.model_dump())
    db.add(new_sensor)
    db.commit()
    db.refresh(new_sensor)
    return new_sensor


@router.get("/", response_model=List[SensorResponse])
def list_sensors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Sensor)
        .join(Farm, Sensor.farm_id == Farm.id)
        .filter(Farm.user_id == current_user.id)
        .all()
    )


@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor(sensor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sensor = (
        db.query(Sensor)
        .join(Farm, Sensor.farm_id == Farm.id)
        .filter(Sensor.id == sensor_id, Farm.user_id == current_user.id)
        .first()
    )
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor


@router.put("/{sensor_id}", response_model=SensorResponse)
def update_sensor(sensor_id: int, sensor_in: SensorUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sensor = (
        db.query(Sensor)
        .join(Farm, Sensor.farm_id == Farm.id)
        .filter(Sensor.id == sensor_id, Farm.user_id == current_user.id)
        .first()
    )
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    for key, value in sensor_in.model_dump(exclude_unset=True).items():
        setattr(sensor, key, value)

    db.commit()
    db.refresh(sensor)
    return sensor


@router.delete("/{sensor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sensor(sensor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sensor = (
        db.query(Sensor)
        .join(Farm, Sensor.farm_id == Farm.id)
        .filter(Sensor.id == sensor_id, Farm.user_id == current_user.id)
        .first()
    )
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    db.delete(sensor)
    db.commit()
    return None
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.farm import Farm
from app.models.irrigation_event import IrrigationEvent
from app.models.user import User
from app.schemas.irrigation_event import IrrigationEventCreate, IrrigationEventResponse

router = APIRouter()


@router.post("/{farm_id}/irrigation-events", response_model=IrrigationEventResponse, status_code=status.HTTP_201_CREATED)
def log_irrigation_event(
    farm_id: int,
    event_in: IrrigationEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    event = IrrigationEvent(
        farm_id=farm_id,
        water_amount_mm=event_in.water_amount_mm,
        irrigated_at=event_in.irrigated_at,
        source="manual",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{farm_id}/irrigation-events", response_model=List[IrrigationEventResponse])
def list_irrigation_events(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    return (
        db.query(IrrigationEvent)
        .filter(IrrigationEvent.farm_id == farm_id)
        .order_by(IrrigationEvent.irrigated_at.desc())
        .all()
    )
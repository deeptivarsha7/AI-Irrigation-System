from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IrrigationEvent(Base):
    """
    A logged record of water actually applied to a farm — either entered
    manually by the farmer, or (later) auto-logged when a schedule event is
    marked complete. This is what makes 'previous_irrigation_mm' in the ML
    feature row real historical data instead of a placeholder constant.
    """
    __tablename__ = "irrigation_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), nullable=False)
    water_amount_mm: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False, server_default="manual")
    irrigated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
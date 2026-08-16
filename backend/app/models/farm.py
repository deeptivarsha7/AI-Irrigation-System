from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    area_hectares: Mapped[float] = mapped_column(Float, nullable=False)
    soil_type: Mapped[str] = mapped_column(String(100), nullable=False)
    crop_type: Mapped[str] = mapped_column(String(100), nullable=False, server_default="Other")
    crop_growth_stage: Mapped[str] = mapped_column(String(50), nullable=False, server_default="Sowing")
    irrigation_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="Rainfed")
    water_source: Mapped[str] = mapped_column(String(50), nullable=False, server_default="Rainwater")
    mulching_used: Mapped[str] = mapped_column(String(5), nullable=False, server_default="No")
    region: Mapped[str] = mapped_column(String(50), nullable=False, server_default="South")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="farms")
    sensors = relationship("Sensor", back_populates="farm", cascade="all, delete")
    irrigation_events = relationship("IrrigationEvent", cascade="all, delete")
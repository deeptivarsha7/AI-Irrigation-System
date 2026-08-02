from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Sensor(Base):
    __tablename__ = "sensors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), nullable=False)
    sensor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    sensor_identifier: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    installed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    farm = relationship("Farm", back_populates="sensors")
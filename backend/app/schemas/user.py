from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    phone_number: str
    password: str
    preferred_language: Optional[str] = "en"


class UserLogin(BaseModel):
    phone_number: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    phone_number: str
    preferred_language: str
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
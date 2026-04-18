from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class CaptureStart(BaseModel):
    interface: str | None = None
    bpf_filter: str | None = Field(default=None, max_length=512)
    force: bool = False

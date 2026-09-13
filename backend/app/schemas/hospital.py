from datetime import datetime

from pydantic import BaseModel, Field

from app.models.org_status import OrgStatus


class HospitalCreate(BaseModel):
    name: str = Field(min_length=2)
    city: str = Field(min_length=2)
    address: str = Field(min_length=5)
    contact_phone: str = Field(min_length=7)


class HospitalOut(BaseModel):
    id: str
    name: str
    city: str
    address: str
    contact_phone: str
    status: OrgStatus
    created_at: datetime
    updated_at: datetime

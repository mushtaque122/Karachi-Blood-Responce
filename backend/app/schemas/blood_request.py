from datetime import datetime

from pydantic import BaseModel, Field

from app.models.blood_group import BloodGroup
from app.models.request_status import RequestStatus
from app.models.urgency import Urgency


class BloodRequestCreate(BaseModel):
    blood_group: BloodGroup
    units_required: int = Field(gt=0, le=20)
    urgency: Urgency = Urgency.NORMAL
    hospital_name: str = Field(min_length=2)
    patient_reference: str | None = None
    required_by: datetime | None = None
    contact_phone: str = Field(min_length=7)
    city: str = Field(min_length=2)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    medical_notes: str | None = None


class BloodRequestOut(BaseModel):
    id: str
    requester_id: str
    blood_group: BloodGroup
    units_required: int
    urgency: Urgency
    hospital_name: str
    patient_reference: str | None
    required_by: datetime | None
    contact_phone: str
    city: str
    latitude: float | None
    longitude: float | None
    medical_notes: str | None
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    fulfilled_at: datetime | None = None


class DonorMatchOut(BaseModel):
    """Privacy-safe candidate view — same rule as donor search: no
    phone, no exact coordinates. distance_km/eta_minutes are real
    (Phase 8) when both donor and request have coordinates on file,
    otherwise null — see app/core/geo.py."""

    donor_id: str
    blood_group: BloodGroup
    city: str
    emergency_availability: bool
    distance_km: float | None
    eta_minutes: int | None
    score: int
    status: str

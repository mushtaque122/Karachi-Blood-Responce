from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator

from app.models.blood_group import BloodGroup
from app.models.donor_status import VerificationStatus


class DonorProfileCreate(BaseModel):
    blood_group: BloodGroup
    city: str = Field(min_length=2)
    phone: str = Field(min_length=7)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    last_donation_date: date | str | None = None
    preferred_hospitals: list[str] = []
    preferred_blood_banks: list[str] = []
    emergency_availability: bool = False

    @field_validator("last_donation_date", mode="before")
    @classmethod
    def parse_donation_date(cls, v):
        if not v or v == "":
            return None
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                return None
        return v


class DonorProfileUpdate(BaseModel):
    city: str | None = None
    phone: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    availability: bool | None = None
    last_donation_date: date | str | None = None
    preferred_hospitals: list[str] | None = None
    preferred_blood_banks: list[str] | None = None
    emergency_availability: bool | None = None

    @field_validator("last_donation_date", mode="before")
    @classmethod
    def parse_donation_date(cls, v):
        if not v or v == "":
            return None
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                return None
        return v


class DonorProfileOut(BaseModel):
    id: str
    user_id: str
    blood_group: BloodGroup
    city: str
    phone: str
    latitude: float | None
    longitude: float | None
    availability: bool
    emergency_availability: bool
    last_donation_date: date | None
    is_eligible: bool
    verification_status: VerificationStatus
    preferred_hospitals: list[str]
    preferred_blood_banks: list[str]


class DonorPublicOut(BaseModel):
    id: str
    blood_group: BloodGroup
    city: str
    availability: bool
    emergency_availability: bool
    is_eligible: bool
    verification_status: VerificationStatus
    distance_km: float | None = None
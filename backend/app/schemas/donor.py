from datetime import date

from pydantic import BaseModel, Field

from app.models.blood_group import BloodGroup
from app.models.donor_status import VerificationStatus


class DonorProfileCreate(BaseModel):
    blood_group: BloodGroup
    city: str = Field(min_length=2)
    phone: str = Field(min_length=7)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    last_donation_date: date | None = None
    preferred_hospitals: list[str] = []
    preferred_blood_banks: list[str] = []
    emergency_availability: bool = False


class DonorProfileUpdate(BaseModel):
    city: str | None = None
    phone: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    availability: bool | None = None
    last_donation_date: date | None = None
    preferred_hospitals: list[str] | None = None
    preferred_blood_banks: list[str] | None = None
    emergency_availability: bool | None = None


class DonorProfileOut(BaseModel):
    """Full profile — only ever returned to the donor themself or
    staff roles with a legitimate reason to see it (never the public
    search endpoint). Precise coordinates live here — never in
    DonorPublicOut."""

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
    """Privacy-safe view for donor search/matching. No phone number,
    no exact coordinates, no name — only an optional rounded distance
    when the caller supplied a reference point. Matches the 'no
    unnecessary personal info exposed publicly' / 'use approximate
    location' requirements."""

    id: str
    blood_group: BloodGroup
    city: str
    availability: bool
    emergency_availability: bool
    is_eligible: bool
    verification_status: VerificationStatus
    distance_km: float | None = None

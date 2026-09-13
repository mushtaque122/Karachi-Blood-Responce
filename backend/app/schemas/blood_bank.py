from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.blood_group import BloodGroup
from app.models.inventory_status import InventoryStatus
from app.models.org_status import OrgStatus


class BloodBankCreate(BaseModel):
    name: str = Field(min_length=2)
    city: str = Field(min_length=2)
    address: str = Field(min_length=5)
    contact_phone: str = Field(min_length=7)


class BloodBankOut(BaseModel):
    id: str
    name: str
    city: str
    address: str
    contact_phone: str
    status: OrgStatus
    created_at: datetime
    updated_at: datetime


class InventoryItemCreate(BaseModel):
    blood_group: BloodGroup
    component_type: str = Field(default="whole_blood")
    units: int = Field(gt=0)
    collection_date: date
    expiry_date: date


class InventoryItemOut(BaseModel):
    id: str
    blood_bank_id: str
    blood_group: BloodGroup
    component_type: str
    units: int
    collection_date: date
    expiry_date: date
    status: InventoryStatus


class InventorySummaryItem(BaseModel):
    """Aggregate, public-safe view — total available units per blood
    group, no batch-level detail (collection dates, exact counts per
    lot) exposed outside staff."""

    blood_group: BloodGroup
    available_units: int

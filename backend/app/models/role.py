from enum import Enum


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    BLOOD_BANK_STAFF = "blood_bank_staff"
    HOSPITAL_STAFF = "hospital_staff"
    DOCTOR = "doctor"
    DONOR = "donor"
    PATIENT_REQUESTER = "patient_requester"
    AMBULANCE_OPERATOR = "ambulance_operator"
    EMERGENCY_COORDINATOR = "emergency_coordinator"
    SUPPORT_AGENT = "support_agent"
    AUDITOR = "auditor"

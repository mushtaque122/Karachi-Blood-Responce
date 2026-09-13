export enum Role {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  BLOOD_BANK_STAFF = "blood_bank_staff",
  HOSPITAL_STAFF = "hospital_staff",
  DOCTOR = "doctor",
  DONOR = "donor",
  PATIENT_REQUESTER = "patient_requester",
  AMBULANCE_OPERATOR = "ambulance_operator",
  EMERGENCY_COORDINATOR = "emergency_coordinator",
  SUPPORT_AGENT = "support_agent",
  AUDITOR = "auditor",
}

export enum BloodGroup {
  A_POS = "A+",
  A_NEG = "A-",
  B_POS = "B+",
  B_NEG = "B-",
  AB_POS = "AB+",
  AB_NEG = "AB-",
  O_POS = "O+",
  O_NEG = "O-",
}

export const ALL_BLOOD_GROUPS: BloodGroup[] = [
  BloodGroup.A_POS,
  BloodGroup.A_NEG,
  BloodGroup.B_POS,
  BloodGroup.B_NEG,
  BloodGroup.AB_POS,
  BloodGroup.AB_NEG,
  BloodGroup.O_POS,
  BloodGroup.O_NEG,
];

export enum Urgency {
  NORMAL = "normal",
  URGENT = "urgent",
  CRITICAL = "critical",
}

export enum RequestStatus {
  DRAFT = "draft",
  PENDING_VERIFICATION = "pending_verification",
  VERIFIED = "verified",
  MATCHING = "matching",
  DONORS_FOUND = "donors_found",
  IN_PROGRESS = "in_progress",
  FULFILLED = "fulfilled",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export enum VerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

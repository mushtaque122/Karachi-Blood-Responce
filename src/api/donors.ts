import { apiClient } from "./client";
import { BloodGroup, VerificationStatus } from "../constants/enums";

export interface DonorProfileCreatePayload {
  blood_group: BloodGroup;
  city: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  last_donation_date?: string; // YYYY-MM-DD
  preferred_hospitals?: string[];
  preferred_blood_banks?: string[];
  emergency_availability?: boolean;
}

export interface DonorProfileUpdatePayload {
  city?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  availability?: boolean;
  last_donation_date?: string;
  preferred_hospitals?: string[];
  preferred_blood_banks?: string[];
  emergency_availability?: boolean;
}

export interface DonorProfileOut {
  id: string;
  user_id: string;
  blood_group: BloodGroup;
  city: string;
  phone: string;
  latitude?: number | null;
  longitude?: number | null;
  availability: boolean;
  emergency_availability: boolean;
  last_donation_date?: string | null;
  is_eligible: boolean;
  verification_status: VerificationStatus;
  preferred_hospitals: string[];
  preferred_blood_banks: string[];
}

export interface DonorPublicOut {
  id: string;
  blood_group: BloodGroup;
  city: string;
  availability: boolean;
  emergency_availability: boolean;
  is_eligible: boolean;
  verification_status: VerificationStatus;
  distance_km?: number | null;
}

export const getMyDonorProfile = async (): Promise<DonorProfileOut> => {
  const response = await apiClient.get<DonorProfileOut>("/api/donors/me");
  return response.data;
};

export const createMyDonorProfile = async (
  payload: DonorProfileCreatePayload
): Promise<DonorProfileOut> => {
  const response = await apiClient.post<DonorProfileOut>("/api/donors/me", payload);
  return response.data;
};

export const updateMyDonorProfile = async (
  payload: DonorProfileUpdatePayload
): Promise<DonorProfileOut> => {
  const response = await apiClient.patch<DonorProfileOut>("/api/donors/me", payload);
  return response.data;
};

export const searchDonors = async (params: {
  blood_group?: BloodGroup;
  city?: string;
  emergency_only?: boolean;
  near_lat?: number;
  near_lng?: number;
  max_distance_km?: number;
  limit?: number;
}): Promise<DonorPublicOut[]> => {
  const response = await apiClient.get<DonorPublicOut[]>("/api/donors/search", { params });
  return response.data;
};

export const verifyDonor = async (
  donorId: string,
  newStatus: "verified" | "rejected"
): Promise<DonorProfileOut> => {
  const response = await apiClient.patch<DonorProfileOut>(
    `/api/donors/${donorId}/verify`,
    {},
    { params: { new_status: newStatus } }
  );
  return response.data;
};

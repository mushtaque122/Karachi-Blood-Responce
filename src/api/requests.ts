import { apiClient } from "./client";
import { BloodGroup, RequestStatus, Urgency } from "../constants/enums";

export interface BloodRequestCreatePayload {
  blood_group: BloodGroup;
  units_required: number;
  urgency: Urgency;
  hospital_name: string;
  patient_reference?: string;
  required_by?: string;
  contact_phone: string;
  city: string;
  latitude?: number;
  longitude?: number;
  medical_notes?: string;
}

export interface BloodRequestOut {
  id: string;
  requester_id: string;
  blood_group: BloodGroup;
  units_required: number;
  urgency: Urgency;
  hospital_name: string;
  patient_reference?: string | null;
  required_by?: string | null;
  contact_phone: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  medical_notes?: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  fulfilled_at?: string | null;
}

export interface DonorMatchOut {
  donor_id: string;
  blood_group: BloodGroup;
  city: string;
  emergency_availability: boolean;
  distance_km?: number | null;
  eta_minutes?: number | null;
  score: number;
  status: string;
}

export const createRequest = async (
  payload: BloodRequestCreatePayload
): Promise<BloodRequestOut> => {
  const response = await apiClient.post<BloodRequestOut>("/api/requests", payload);
  return response.data;
};

export const listMyRequests = async (): Promise<BloodRequestOut[]> => {
  const response = await apiClient.get<BloodRequestOut[]>("/api/requests/me");
  return response.data;
};

export const listStaffRequests = async (params?: {
  status?: RequestStatus;
  blood_group?: BloodGroup;
  urgency?: Urgency;
  limit?: number;
}): Promise<BloodRequestOut[]> => {
  const response = await apiClient.get<BloodRequestOut[]>("/api/requests", { params });
  return response.data;
};

export const getRequest = async (requestId: string): Promise<BloodRequestOut> => {
  const response = await apiClient.get<BloodRequestOut>(`/api/requests/${requestId}`);
  return response.data;
};

export const submitRequest = async (requestId: string): Promise<BloodRequestOut> => {
  const response = await apiClient.patch<BloodRequestOut>(`/api/requests/${requestId}/submit`);
  return response.data;
};

export const verifyRequest = async (requestId: string): Promise<BloodRequestOut> => {
  const response = await apiClient.patch<BloodRequestOut>(`/api/requests/${requestId}/verify`);
  return response.data;
};

export const cancelRequest = async (requestId: string): Promise<BloodRequestOut> => {
  const response = await apiClient.patch<BloodRequestOut>(`/api/requests/${requestId}/cancel`);
  return response.data;
};

export const startFulfillment = async (requestId: string): Promise<BloodRequestOut> => {
  const response = await apiClient.patch<BloodRequestOut>(`/api/requests/${requestId}/start`);
  return response.data;
};

export const fulfillRequest = async (requestId: string): Promise<BloodRequestOut> => {
  const response = await apiClient.patch<BloodRequestOut>(`/api/requests/${requestId}/fulfill`);
  return response.data;
};

export const runMatching = async (requestId: string): Promise<DonorMatchOut[]> => {
  const response = await apiClient.post<DonorMatchOut[]>(`/api/requests/${requestId}/match`);
  return response.data;
};

export const getMatches = async (requestId: string): Promise<DonorMatchOut[]> => {
  const response = await apiClient.get<DonorMatchOut[]>(`/api/requests/${requestId}/matches`);
  return response.data;
};

import { apiClient } from "./client";

export interface DashboardSummary {
  total_donors: number;
  verified_donors: number;
  available_donors: number;
  total_requests: number;
  requests_by_status: Record<string, number>;
  total_hospitals: number;
  verified_hospitals: number;
  total_blood_banks: number;
  verified_blood_banks: number;
  notifications_sent: number;
  notifications_failed: number;
  ai_sessions_total: number;
  ai_tool_calls_blocked: number;
}

export interface RequestAnalytics {
  total_requests: number;
  fulfilled_requests: number;
  cancelled_requests: number;
  fulfillment_rate_pct: number;
  avg_fulfillment_minutes?: number | null;
  requests_by_blood_group: Record<string, number>;
  requests_by_urgency: Record<string, number>;
}

export interface DonorAnalytics {
  total_donors: number;
  verified_donors: number;
  available_donors: number;
  emergency_available_donors: number;
  eligible_donors: number;
  donors_by_blood_group: Record<string, number>;
  donors_by_city: Record<string, number>;
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get<DashboardSummary>("/api/admin/dashboard");
  return response.data;
};

export const getRequestAnalytics = async (): Promise<RequestAnalytics> => {
  const response = await apiClient.get<RequestAnalytics>("/api/admin/analytics/requests");
  return response.data;
};

export const getDonorAnalytics = async (): Promise<DonorAnalytics> => {
  const response = await apiClient.get<DonorAnalytics>("/api/admin/analytics/donors");
  return response.data;
};

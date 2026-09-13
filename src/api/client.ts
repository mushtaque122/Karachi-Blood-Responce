import axios, { AxiosError } from "axios";
import { getApiBaseUrl } from "../config/api";
import { getItem, removeItem } from "../utils/storage";

export const apiClient = axios.create({
  timeout: 15000,
});

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

// Dynamically attach baseURL & Bearer token on every request
apiClient.interceptors.request.use(
  async (config) => {
    config.baseURL = getApiBaseUrl();
    const token = await getItem("kbr_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: redirect on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Check if it's a login failure (which also returns 401) vs token expired
      const isLoginEndpoint = error.config?.url?.includes("/api/auth/login");
      if (!isLoginEndpoint) {
        await removeItem("kbr_access_token");
        await removeItem("kbr_user_profile");
        if (unauthorizedHandler) {
          unauthorizedHandler();
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred. Please check your network connection.";
};

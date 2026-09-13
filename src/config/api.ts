import { Platform } from "react-native";

// Physical devices on Expo Go need LAN IP. Emulators can use localhost / 10.0.2.2.
export const DEFAULT_API_BASE_URL = "http://192.168.0.110:8000";

let customBaseUrl: string | null = null;

export const setCustomBaseUrl = (url: string) => {
  customBaseUrl = url.trim().replace(/\/+$/, "");
};

export const getApiBaseUrl = (): string => {
  if (customBaseUrl) return customBaseUrl;
  return DEFAULT_API_BASE_URL;
};

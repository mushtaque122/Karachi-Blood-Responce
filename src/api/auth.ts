import { apiClient } from "./client";
import { Role } from "../constants/enums";

export interface UserRegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: Role.PATIENT_REQUESTER | Role.DONOR;
}

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const registerUser = async (payload: UserRegisterPayload): Promise<UserOut> => {
  const response = await apiClient.post<UserOut>("/api/auth/register", payload);
  return response.data;
};

export const loginUser = async (
  email: string,
  password: string,
  mfaCode?: string
): Promise<TokenResponse> => {
  // OAuth2PasswordRequestForm expects application/x-www-form-urlencoded with username & password
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (mfaCode) {
    headers["X-MFA-Code"] = mfaCode;
  }

  const response = await apiClient.post<TokenResponse>("/api/auth/login", params.toString(), {
    headers,
  });
  return response.data;
};

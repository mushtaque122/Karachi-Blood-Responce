import React, { createContext, useContext, useEffect, useState } from "react";
import { Role } from "../constants/enums";
import { loginUser, registerUser, UserRegisterPayload } from "../api/auth";
import { getItem, setItem, removeItem } from "../utils/storage";
import { setUnauthorizedHandler } from "../api/client";

export interface CurrentUser {
  email: string;
  role: Role;
  fullName?: string;
}

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string, mfaCode?: string) => Promise<void>;
  register: (payload: UserRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUserRole: () => {},
});

const TOKEN_KEY = "kbr_access_token";
const USER_KEY = "kbr_user_profile";

// Simple base64 decoding helper
function base64Decode(str: string): string {
  if (typeof atob === "function") {
    return atob(str);
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  str = String(str).replace(/=+$/, "");
  for (let bc = 0, bs = 0, buffer = 0, idx = 0; (buffer = str.charCodeAt(idx++)); ) {
    const charIndex = chars.indexOf(String.fromCharCode(buffer));
    if (~charIndex) {
      bs = bc % 4 ? bs * 64 + charIndex : charIndex;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }
  return output;
}

// Decode JWT payload safely
function decodeJwt(token: string): { sub?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonStr = base64Decode(base64);
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = async () => {
    await removeItem(TOKEN_KEY);
    await removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    // Register auto-logout on 401
    setUnauthorizedHandler(() => {
      logout();
    });

    // Hydrate token on mount
    (async () => {
      try {
        const storedToken = await getItem(TOKEN_KEY);
        const storedUser = await getItem(USER_KEY);

        if (storedToken) {
          const decoded = decodeJwt(storedToken);
          const nowSeconds = Math.floor(Date.now() / 1000);
          if (decoded && decoded.exp && decoded.exp < nowSeconds) {
            // Token expired
            await logout();
          } else {
            setToken(storedToken);
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch {
                if (decoded && decoded.sub && decoded.role) {
                  setUser({ email: decoded.sub, role: decoded.role as Role });
                }
              }
            } else if (decoded && decoded.sub && decoded.role) {
              setUser({ email: decoded.sub, role: decoded.role as Role });
            }
          }
        }
      } catch {
        // Ignore hydration failure
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, pass: string, mfaCode?: string) => {
    const res = await loginUser(email, pass, mfaCode);
    const decoded = decodeJwt(res.access_token);
    const role = (decoded?.role as Role) || Role.PATIENT_REQUESTER;
    const userObj: CurrentUser = {
      email,
      role,
    };

    await setItem(TOKEN_KEY, res.access_token);
    await setItem(USER_KEY, JSON.stringify(userObj));
    setToken(res.access_token);
    setUser(userObj);
  };

  const register = async (payload: UserRegisterPayload) => {
    await registerUser(payload);
  };

  const updateUserRole = (newRole: Role) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      setItem(USER_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

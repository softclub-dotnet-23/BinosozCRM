import { request } from "./apiClient";
import type { UserRole } from "../types";

export type BackendRole = "Owner" | "Prorab" | "Brigadir" | "Accountant";

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  forcePasswordChange: boolean;
  role: BackendRole;
}

/** Backend only ever returns these four (Domain/Enums/Role.cs) — an unrecognized value here means the API added a role this frontend doesn't know about yet, which should fail loudly rather than silently default. */
export function mapBackendRole(role: BackendRole): UserRole {
  switch (role) {
    case "Owner":
      return "owner";
    case "Prorab":
      return "prorab";
    case "Brigadir":
      return "brigadir";
    case "Accountant":
      return "accountant";
    default:
      throw new Error(`Unmapped backend role: ${role as string}`);
  }
}

export interface CurrentUser {
  id: string;
  phone: string;
  fullName: string;
  role: BackendRole;
}

export function getCurrentUser(): Promise<CurrentUser> {
  return request<CurrentUser>("/api/v1/auth/me");
}

export function login(phone: string, password: string): Promise<AuthTokens> {
  return request<AuthTokens>("/api/v1/auth/login", {
    method: "POST",
    body: { phone, password },
    skipAuthRetry: true,
  });
}

export function refreshSession(refreshToken: string): Promise<AuthTokens> {
  return request<AuthTokens>("/api/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuthRetry: true,
  });
}

export function logout(refreshToken: string): Promise<void> {
  return request<void>("/api/v1/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return request<void>("/api/v1/auth/change-password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}

export function forgotPassword(phone: string): Promise<void> {
  return request<void>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: { phone },
    skipAuthRetry: true,
  });
}

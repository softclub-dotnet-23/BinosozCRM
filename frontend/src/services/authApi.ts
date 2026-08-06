import { apiClient } from "./apiClient";
import type { BackendRole } from "./types";

/** Api/Contracts/Auth + Application/Auth/AuthTokensDto.cs. */
export interface LoginRequest {
  phone: string;
  password: string;
}

export interface AuthTokensDto {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  forcePasswordChange: boolean;
  role: BackendRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  phone: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// AuthController — api/v1/auth. Every success here is HTTP 200 with the raw DTO body
// (POST /logout, PUT /change-password, POST /forgot-password and /reset-password return no
// body at all — Result, not Result<T> — so their responses are typed void).
export const authApi = {
  login: (request: LoginRequest) => apiClient.post<AuthTokensDto>("/auth/login", request).then((r) => r.data),

  refresh: (request: RefreshTokenRequest) => apiClient.post<AuthTokensDto>("/auth/refresh", request).then((r) => r.data),

  logout: (request: RefreshTokenRequest) => apiClient.post<void>("/auth/logout", request).then((r) => r.data),

  changePassword: (request: ChangePasswordRequest) => apiClient.put<void>("/auth/change-password", request).then((r) => r.data),

  forgotPassword: (request: ForgotPasswordRequest) => apiClient.post<void>("/auth/forgot-password", request).then((r) => r.data),

  resetPassword: (request: ResetPasswordRequest) => apiClient.post<void>("/auth/reset-password", request).then((r) => r.data),
};

import { authApi } from "../../services/authApi";
import { decodeAccessTokenClaims } from "../../services/jwt";
import { normalizeApiError, type NormalizedApiError } from "../../services/apiError";
import { readRefreshToken, updateAccessToken } from "../../services/tokenStorage";
import { usersRepository } from "../../data/repositories";
import { DEMO_CREDENTIALS } from "../../data/demoCredentials";
import type { BackendRole } from "../../services/types";
import type { SessionUser, UserRole } from "../../types";

export interface AuthSuccess {
  ok: true;
  user: SessionUser;
  /** Only present for a real backend session (user.isBackendSession === true). Mock/demo logins
   * never carry tokens — apiClient simply sends no Authorization header, and any backend-connected
   * page's own error state handles the resulting 401/network error, exactly like it would for a
   * signed-out visitor. */
  tokens?: { accessToken: string; accessTokenExpiresAt: string; refreshToken: string };
  forcePasswordChange?: boolean;
}

export interface AuthFailure {
  ok: false;
  error: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

const BACKEND_ROLE_TO_FRONTEND: Record<BackendRole, UserRole> = {
  Owner: "owner",
  Prorab: "prorab",
  Brigadir: "brigadir",
  Accountant: "accountant",
};

/**
 * Hybrid login: the real backend (POST /api/v1/auth/login, phone + password) is always tried
 * first. Only when the backend rejects the attempt — wrong credentials, unreachable, or the
 * entered value simply isn't a phone number at all — does this fall back to the local mock/demo
 * dataset (data/mockUsers.ts + data/demoCredentials.ts), and only for logins DEMO_CREDENTIALS
 * actually recognizes. A mock login is never granted a real role: it always resolves to whatever
 * role data/mockUsers.ts assigns it (including frontend-only roles like "administrator"/"worker"/
 * "storekeeper" that have no backend counterpart), tagged isBackendSession: false, and carries no
 * tokens — apiClient will send these requests with no Authorization header, so backend-connected
 * pages must gate on isBackendSession rather than assuming a mock "administrator" is a real Owner.
 */
export async function authenticate(login: string, password: string): Promise<AuthResult> {
  const trimmedLogin = login.trim();

  try {
    const tokens = await authApi.login({ phone: trimmedLogin, password });
    const claims = decodeAccessTokenClaims(tokens.accessToken);
    const user: SessionUser = {
      id: claims.userId ?? trimmedLogin,
      login: trimmedLogin,
      // The backend JWT carries no display name (no GET /users/me) — the phone number entered at
      // login is the only identifying value available for a real backend session.
      fullName: trimmedLogin,
      role: BACKEND_ROLE_TO_FRONTEND[tokens.role],
      employeeId: null,
      isBackendSession: true,
    };
    return {
      ok: true,
      user,
      tokens: { accessToken: tokens.accessToken, accessTokenExpiresAt: tokens.accessTokenExpiresAt, refreshToken: tokens.refreshToken },
      forcePasswordChange: tokens.forcePasswordChange,
    };
  } catch {
    // Backend rejected the attempt (wrong credentials, unreachable, rate-limited, or the value
    // isn't a phone at all) — fall through to the mock dataset below rather than surfacing a
    // backend-shaped error for what may just be a demo login attempt.
  }

  const account = usersRepository.getSnapshot().find((u) => u.login === trimmedLogin);

  if (!account || DEMO_CREDENTIALS[trimmedLogin] !== password) {
    return { ok: false, error: "Неверный логин или пароль" };
  }
  if (account.status === "blocked") {
    return { ok: false, error: "Учётная запись заблокирована. Обратитесь к администратору." };
  }
  if (account.status === "inactive") {
    return { ok: false, error: "Учётная запись неактивна. Обратитесь к администратору." };
  }

  const user: SessionUser = {
    id: account.id,
    login: account.login,
    fullName: account.fullName,
    role: account.role,
    employeeId: account.employeeId,
    isBackendSession: false,
  };

  return { ok: true, user };
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: NormalizedApiError };

/**
 * PUT /auth/change-password succeeding doesn't update the current access token's
 * force_password_change claim — JWTs can't be mutated in place — so this always follows up with
 * POST /auth/refresh (documented backend behavior) to obtain a token that actually reflects the
 * change, before the caller flips the local forcePasswordChange flag.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  try {
    await authApi.changePassword({ currentPassword, newPassword });

    const refreshToken = readRefreshToken();
    if (refreshToken) {
      const refreshed = await authApi.refresh({ refreshToken });
      updateAccessToken(refreshed.accessToken, refreshed.accessTokenExpiresAt);
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: normalizeApiError(err) };
  }
}

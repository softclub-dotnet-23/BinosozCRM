import { authApi } from "../../services/authApi";
import { decodeAccessTokenClaims } from "../../services/jwt";
import { normalizeApiError, type NormalizedApiError } from "../../services/apiError";
import { readRefreshToken, updateAccessToken } from "../../services/tokenStorage";
import type { BackendRole } from "../../services/types";
import type { SessionUser, UserRole } from "../../types";

export interface AuthSuccess {
  ok: true;
  user: SessionUser;
  tokens: { accessToken: string; accessTokenExpiresAt: string; refreshToken: string };
  forcePasswordChange: boolean;
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

/** POST /api/v1/auth/login (phone + password) — the only authentication path. */
export async function authenticate(login: string, password: string): Promise<AuthResult> {
  const trimmedLogin = login.trim();

  try {
    const tokens = await authApi.login({ phone: trimmedLogin, password });
    const claims = decodeAccessTokenClaims(tokens.accessToken);
    const user: SessionUser = {
      id: claims.userId ?? trimmedLogin,
      login: trimmedLogin,
      // Filled in from GET /users/me right after login (see AuthContext) — the JWT itself
      // carries no display name.
      fullName: trimmedLogin,
      role: BACKEND_ROLE_TO_FRONTEND[tokens.role],
    };
    return {
      ok: true,
      user,
      tokens: {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshToken: tokens.refreshToken,
      },
      forcePasswordChange: tokens.forcePasswordChange,
    };
  } catch (err) {
    const normalized = normalizeApiError(err);
    if (normalized.kind === "network") {
      return { ok: false, error: "Сервер недоступен. Проверьте подключение и попробуйте ещё раз." };
    }
    if (normalized.status === 401 || normalized.status === 400) {
      return { ok: false, error: "Неверный логин или пароль" };
    }
    return { ok: false, error: normalized.message };
  }
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

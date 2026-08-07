import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { getCurrentUser, login as loginApi, logout as logoutApi, mapBackendRole, type AuthTokens } from "../api/authApi";
import { ApiError, NetworkError } from "../api/apiClient";
import { clearSession, getForcePasswordChange, getRefreshToken, readUser, saveSession, subscribe } from "../lib/auth/session";
import type { SessionUser } from "../types";

/** Category of a failed login, for the caller to localize — AuthContext doesn't own presentation strings. Matches keys on LoginStrings (loginTranslations.ts). */
export type LoginErrorCode = "invalidCredentials" | "accountDeactivated" | "networkError" | "serverError";

export interface AuthSuccess {
  ok: true;
}

export interface AuthFailure {
  ok: false;
  errorCode: LoginErrorCode;
}

export type AuthResult = AuthSuccess | AuthFailure;

interface AuthContextValue {
  user: SessionUser | null;
  forcePasswordChange: boolean;
  login: (phone: string, password: string, remember: boolean) => Promise<AuthResult>;
  /** Same session/token flow as password login (persist + hydrate /auth/me), for callers that already have a fresh AuthTokensDto — e.g. QrLoginModal after a successful exchange. */
  applyTokens: (tokens: AuthTokens, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Shared by login() and applyTokens(): persists a placeholder identity first
 * (apiClient reads the access token from the saved session, so /auth/me needs
 * a session to already exist), then upgrades to the real identity once
 * /auth/me resolves. Skipped while forcePasswordChange is set — every other
 * endpoint 403s until that's cleared, /auth/me included.
 */
async function persistAndHydrate(tokens: AuthTokens, loginValue: string, remember: boolean): Promise<void> {
  const role = mapBackendRole(tokens.role);

  const persist = (identity: SessionUser) =>
    saveSession(
      {
        user: identity,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshToken: tokens.refreshToken,
        forcePasswordChange: tokens.forcePasswordChange,
      },
      remember,
    );

  persist({ id: "", login: loginValue, fullName: loginValue, role });

  if (!tokens.forcePasswordChange) {
    try {
      const me = await getCurrentUser();
      persist({ id: me.id, login: me.phone, fullName: me.fullName, role: mapBackendRole(me.role) });
    } catch {
      // /auth/me failed — keep the phone-only placeholder identity, not fatal
    }
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapLoginError(error: unknown): LoginErrorCode {
  if (error instanceof NetworkError) return "networkError";
  if (error instanceof ApiError) {
    switch (error.code) {
      case "AUTH_INVALID_CREDENTIALS":
        return "invalidCredentials";
      case "AUTH_ACCOUNT_DEACTIVATED":
        return "accountDeactivated";
      default:
        return "serverError";
    }
  }
  return "serverError";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, readUser, readUser);
  const forcePasswordChange = useSyncExternalStore(subscribe, getForcePasswordChange, getForcePasswordChange);

  const login = useCallback(async (phone: string, password: string, remember: boolean): Promise<AuthResult> => {
    try {
      const tokens = await loginApi(phone, password);
      await persistAndHydrate(tokens, phone, remember);
      return { ok: true };
    } catch (error) {
      return { ok: false, errorCode: mapLoginError(error) };
    }
  }, []);

  const applyTokens = useCallback(async (tokens: AuthTokens, remember: boolean): Promise<void> => {
    await persistAndHydrate(tokens, "", remember);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // best-effort — the session is cleared locally regardless of server outcome
      }
    }
    clearSession();
  }, []);

  return <AuthContext.Provider value={{ user, forcePasswordChange, login, applyTokens, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

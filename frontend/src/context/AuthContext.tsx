import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authenticate, type AuthResult } from "../lib/auth/authService";
import { clearSession, onSessionStorageChange, readSession, saveSession } from "../lib/auth/session";
import { clearTokens, readRefreshToken, saveTokens } from "../services/tokenStorage";
import { setSessionExpiredHandler } from "../services/apiClient";
import { authApi } from "../services/authApi";
import type { SessionUser } from "../types";

const FORCE_PASSWORD_CHANGE_KEY = "binosoz:auth-force-password-change";

function readForcePasswordChange(): boolean {
  try {
    return sessionStorage.getItem(FORCE_PASSWORD_CHANGE_KEY) === "true" || localStorage.getItem(FORCE_PASSWORD_CHANGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeForcePasswordChange(value: boolean): void {
  try {
    if (value) {
      sessionStorage.setItem(FORCE_PASSWORD_CHANGE_KEY, "true");
    } else {
      sessionStorage.removeItem(FORCE_PASSWORD_CHANGE_KEY);
      localStorage.removeItem(FORCE_PASSWORD_CHANGE_KEY);
    }
  } catch {
    // storage unavailable — forcePasswordChange just won't survive a reload, not fatal
  }
}

interface AuthContextValue {
  user: SessionUser | null;
  forcePasswordChange: boolean;
  login: (login: string, password: string, remember: boolean) => Promise<AuthResult>;
  logout: () => void;
  completePasswordChange: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readSession());
  const [forcePasswordChange, setForcePasswordChange] = useState(() => readForcePasswordChange());

  const logout = useCallback(() => {
    const refreshToken = readRefreshToken();
    clearSession();
    clearTokens();
    writeForcePasswordChange(false);
    setUser(null);
    setForcePasswordChange(false);
    // Best-effort — the session is already torn down locally either way, and there's no UI
    // waiting on this (unlike login, nothing should block on the server round-trip to sign out).
    if (refreshToken) {
      authApi.logout({ refreshToken }).catch(() => {});
    }
  }, []);

  useEffect(() => onSessionStorageChange(() => setUser(readSession())), []);

  // The apiClient interceptor calls this when a refresh attempt fails (refresh token expired,
  // reused, or revoked) — it has no React context of its own, so this is how it reaches back in
  // to actually tear down the session instead of leaving stale tokens the UI still trusts.
  useEffect(() => {
    setSessionExpiredHandler(logout);
    return () => setSessionExpiredHandler(null);
  }, [logout]);

  const login = useCallback(async (loginValue: string, password: string, remember: boolean) => {
    const result = await authenticate(loginValue, password);
    if (result.ok) {
      saveSession(result.user, remember);
      saveTokens(result.tokens, remember);
      writeForcePasswordChange(result.forcePasswordChange ?? false);
      setUser(result.user);
      setForcePasswordChange(result.forcePasswordChange ?? false);
    }
    return result;
  }, []);

  // Called once PUT /auth/change-password has succeeded. The access token issued at login still
  // carries the old force_password_change=true claim (JWTs aren't mutable server-side), so the
  // caller must refresh before this — otherwise every subsequent request keeps 403ing against
  // ForcePasswordChangeMiddleware even though the password was actually changed.
  const completePasswordChange = useCallback(() => {
    writeForcePasswordChange(false);
    setForcePasswordChange(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, forcePasswordChange, login, logout, completePasswordChange }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

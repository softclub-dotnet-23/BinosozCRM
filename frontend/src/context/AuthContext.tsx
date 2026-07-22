import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authenticate, type AuthResult } from "../lib/auth/authService";
import { clearSession, onSessionStorageChange, readSession, saveSession } from "../lib/auth/session";
import type { SessionUser } from "../types";

interface AuthContextValue {
  user: SessionUser | null;
  login: (login: string, password: string, remember: boolean) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readSession());

  useEffect(() => onSessionStorageChange(() => setUser(readSession())), []);

  const login = useCallback(async (loginInput: string, password: string, remember: boolean) => {
    const result = await authenticate(loginInput, password);
    if (result.ok) {
      saveSession(result.user, remember);
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, readAccessToken, readRefreshToken, updateAccessToken } from "./tokenStorage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  // Fails loudly at startup instead of silently sending requests to a relative "" baseURL
  // (which would resolve against the Vite dev origin and 404 in a confusing way).
  throw new Error("VITE_API_BASE_URL is not set. Add it to frontend/.env.local and restart Vite.");
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
});

/** Registered by AuthContext on mount — lets the interceptor clear the session and bounce to
 * /login without this module importing React Router or the auth context itself (would be a
 * circular dependency: AuthContext needs apiClient, apiClient would need AuthContext). */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = readAccessToken();
  if (token) {
    config.headers = config.headers ?? new AxiosHeaders();
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// Concurrent requests that all 401 at once (e.g. a page firing several queries in parallel)
// must share a single POST /auth/refresh call, not one each — the refresh token is one-time-use
// with reuse detection on the backend (RefreshTokenCommand), so a second concurrent refresh call
// would find the first token already rotated and fail, tearing down a session that was actually fine.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post<{ accessToken: string; accessTokenExpiresAt: string; refreshToken: string }>(
      `${apiBaseUrl}/auth/refresh`,
      { refreshToken },
    );
    updateAccessToken(response.data.accessToken, response.data.accessTokenExpiresAt);
    return response.data.accessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config as RetryableConfig;
    const isAuthEndpoint = config.url?.includes("/auth/login") || config.url?.includes("/auth/refresh");

    // A mock/demo session (see authService.authenticate) never stores an access token — it was
    // never a real backend session to begin with, so a stray 401 from a backend-connected page
    // must not tear down the mock session and bounce the user back to /login. Only sessions that
    // actually started with a real token attempt the refresh-or-logout dance below.
    if (error.response?.status !== 401 || config._retried || isAuthEndpoint || !readAccessToken()) {
      return Promise.reject(error);
    }

    config._retried = true;

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      clearTokens();
      onSessionExpired?.();
      return Promise.reject(error);
    }

    config.headers = config.headers ?? new AxiosHeaders();
    config.headers.set("Authorization", `Bearer ${newAccessToken}`);
    return apiClient(config);
  },
);

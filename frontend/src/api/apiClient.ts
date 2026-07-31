import { clearSession, getAccessToken, getRefreshToken, updateTokens } from "../lib/auth/session";

const DEFAULT_BASE_URL = "http://localhost:5080";

function getBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;
}

/** Backend error envelope shape — the only one this API ever returns, for validation failures, business-rule failures, and unhandled exceptions alike (Api/Common/ResultExtensions.cs). */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId: string;

  constructor(code: string, message: string, status: number, traceId: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.traceId = traceId;
  }
}

/** Thrown when fetch itself rejects (backend unreachable) — distinct from a real HTTP error response. */
export class NetworkError extends Error {
  constructor(message = "Не удалось подключиться к серверу") {
    super(message);
    this.name = "NetworkError";
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string; traceId: string };
}

interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  forcePasswordChange: boolean;
  role: string;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  signal?: AbortSignal;
  /** Skips the Authorization header and the 401-refresh-retry entirely — for login/refresh/logout, which must never recurse into their own retry logic. */
  skipAuthRetry?: boolean;
}

// Deduplicates concurrent 401s: the first one kicks off the real refresh call,
// every other one in flight at the same time just awaits this same promise
// instead of firing its own POST /auth/refresh.
let inflightRefresh: Promise<RefreshTokenResponse> | null = null;

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(`${getBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new NetworkError();
  }
}

async function parseError(response: Response): Promise<never> {
  let envelope: ErrorEnvelope | null = null;
  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    // non-JSON error body — fall through to the generic ApiError below
  }
  throw new ApiError(
    envelope?.error.code ?? "UNKNOWN_ERROR",
    envelope?.error.message ?? `Request failed with status ${response.status}`,
    response.status,
    envelope?.error.traceId ?? "",
  );
}

async function refreshTokens(): Promise<RefreshTokenResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError("AUTH_REFRESH_TOKEN_INVALID", "No refresh token available", 401, "");
  }

  const response = await rawFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuthRetry: true,
  });

  if (!response.ok) return parseError(response);

  const tokens = (await response.json()) as RefreshTokenResponse;
  updateTokens(tokens);
  return tokens;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawFetch(path, options);

  if (response.status === 401 && !options.skipAuthRetry) {
    try {
      inflightRefresh ??= refreshTokens().finally(() => {
        inflightRefresh = null;
      });
      await inflightRefresh;
    } catch {
      clearSession();
      return parseError(response);
    }
    response = await rawFetch(path, options);
  }

  if (!response.ok) return parseError(response);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

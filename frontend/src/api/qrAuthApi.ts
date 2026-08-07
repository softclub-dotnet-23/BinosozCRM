import { request } from "./apiClient";
import type { AuthTokens } from "./authApi";

export type QrLoginStatus = "Pending" | "Scanned" | "Approved" | "Rejected" | "Expired";

export interface QrLoginStart {
  sessionId: string;
  qrPayload: string;
  /** The one-time secret embedded in qrPayload — kept in memory only, needed again for exchange(). Never persisted, never rendered as text. */
  qrToken: string;
  expiresAt: string;
}

/** POST /api/v1/auth/qr/start — anonymous, begins a new QR login session. */
export function startQrLogin(): Promise<QrLoginStart> {
  return request<QrLoginStart>("/api/v1/auth/qr/start", { method: "POST", skipAuthRetry: true });
}

/** GET /api/v1/auth/qr/{sessionId}/status — anonymous, polled by the web client while the modal is open. */
export function getQrLoginStatus(sessionId: string): Promise<{ status: QrLoginStatus }> {
  return request<{ status: QrLoginStatus }>(`/api/v1/auth/qr/${sessionId}/status`, { skipAuthRetry: true });
}

/** POST /api/v1/auth/qr/{sessionId}/exchange — anonymous but requires qrToken; one-time, returns the same shape as password login. */
export function exchangeQrLogin(sessionId: string, qrToken: string): Promise<AuthTokens> {
  return request<AuthTokens>(`/api/v1/auth/qr/${sessionId}/exchange`, {
    method: "POST",
    body: { qrToken },
    skipAuthRetry: true,
  });
}

/**
 * Development-only convenience call — emulates "an authenticated mobile
 * client scanned and approved this session" by verifying phone+password
 * inline instead of requiring a real second device. The backend 404s this
 * endpoint outside Development (Api/Controllers/QrLoginController.cs); it
 * runs through the exact same approval state machine as the real endpoint,
 * nothing here is faked.
 */
export function devApproveQrLogin(sessionId: string, qrToken: string, phone: string, password: string): Promise<void> {
  return request<void>("/api/v1/auth/qr/dev/approve", {
    method: "POST",
    body: { sessionId, qrToken, phone, password },
    skipAuthRetry: true,
  });
}

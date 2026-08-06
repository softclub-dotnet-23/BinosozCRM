import { AxiosError } from "axios";

/** Exact §9.1 error envelope every backend failure uses — see Api/Common/ErrorEnvelope.cs
 * and Api/Common/ResultExtensions.cs on the backend. */
export interface BackendErrorPayload {
  error: {
    code: string;
    message: string;
    traceId: string;
  };
}

export type ApiErrorKind = "validation" | "unauthenticated" | "forbidden" | "not-found" | "conflict" | "rate-limited" | "server" | "network";

export interface NormalizedApiError {
  kind: ApiErrorKind;
  code: string;
  message: string;
  traceId?: string;
  status?: number;
}

function kindForStatus(status: number | undefined): ApiErrorKind {
  switch (status) {
    case 400:
      return "validation";
    case 401:
      return "unauthenticated";
    case 403:
      return "forbidden";
    case 404:
      return "not-found";
    case 409:
      return "conflict";
    case 429:
      return "rate-limited";
    default:
      return status && status >= 500 ? "server" : "validation";
  }
}

/** Turns any thrown value from an apiClient call into one consistent shape, so every page's
 * catch block can rely on the same fields instead of guessing whether it got an Axios error,
 * a raw Error, or the backend's own { error: {...} } envelope. */
export function normalizeApiError(err: unknown): NormalizedApiError {
  if (err instanceof AxiosError) {
    if (!err.response) {
      return { kind: "network", code: "NETWORK_ERROR", message: "Не удалось связаться с сервером. Проверьте подключение." };
    }

    const status = err.response.status;
    const payload = err.response.data as Partial<BackendErrorPayload> | undefined;
    const backendError = payload?.error;

    if (backendError?.code && backendError.message) {
      return {
        kind: kindForStatus(status),
        code: backendError.code,
        message: backendError.message,
        traceId: backendError.traceId,
        status,
      };
    }

    // Role-gated [Authorize(Roles=...)] failures return a bare 403 with no body from the
    // ASP.NET Core authorization middleware itself — it never reaches ResultExtensions.
    if (status === 403) {
      return { kind: "forbidden", code: "FORBIDDEN", message: "У вас нет доступа к этому действию.", status };
    }

    return { kind: kindForStatus(status), code: "UNKNOWN_ERROR", message: "Произошла ошибка. Попробуйте ещё раз.", status };
  }

  if (err instanceof Error) {
    return { kind: "network", code: "UNKNOWN_ERROR", message: err.message };
  }

  return { kind: "network", code: "UNKNOWN_ERROR", message: "Произошла неизвестная ошибка." };
}

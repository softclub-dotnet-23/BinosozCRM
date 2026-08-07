import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QrLoginModal } from "./QrLoginModal";
import { ApiError } from "../../api/apiClient";
import * as qrAuthApi from "../../api/qrAuthApi";

const applyTokens = vi.fn().mockResolvedValue(undefined);

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ applyTokens }),
}));

const SESSION = {
  sessionId: "11111111-1111-1111-1111-111111111111",
  qrToken: "raw-secret-token",
  qrPayload: "binosoz-qrlogin://auth?sessionId=11111111-1111-1111-1111-111111111111&token=raw-secret-token",
  expiresAt: new Date(Date.now() + 180_000).toISOString(),
};

describe("QrLoginModal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    applyTokens.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts a session on open and renders the QR code", async () => {
    const startSpy = vi.spyOn(qrAuthApi, "startQrLogin").mockResolvedValue(SESSION);
    vi.spyOn(qrAuthApi, "getQrLoginStatus").mockResolvedValue({ status: "Pending" });

    render(<QrLoginModal open onClose={vi.fn()} />);

    await waitFor(() => expect(startSpy).toHaveBeenCalledTimes(1));
    await screen.findByText(/Ожидание сканирования/);
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("shows the pending state, then switches to the confirm-on-phone state once scanned", async () => {
    vi.spyOn(qrAuthApi, "startQrLogin").mockResolvedValue(SESSION);
    const statusSpy = vi.spyOn(qrAuthApi, "getQrLoginStatus").mockResolvedValueOnce({ status: "Pending" }).mockResolvedValue({ status: "Scanned" });

    render(<QrLoginModal open onClose={vi.fn()} />);
    await screen.findByText(/Ожидание сканирования/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    await waitFor(() => expect(statusSpy).toHaveBeenCalled());
    await screen.findByText(/Подтвердите вход на телефоне/);
  });

  it("on Approved status, exchanges the session, applies the tokens, and closes the modal", async () => {
    vi.spyOn(qrAuthApi, "startQrLogin").mockResolvedValue(SESSION);
    vi.spyOn(qrAuthApi, "getQrLoginStatus").mockResolvedValueOnce({ status: "Pending" }).mockResolvedValue({ status: "Approved" });
    const exchangeSpy = vi.spyOn(qrAuthApi, "exchangeQrLogin").mockResolvedValue({
      accessToken: "access",
      accessTokenExpiresAt: new Date().toISOString(),
      refreshToken: "refresh",
      forcePasswordChange: false,
      role: "Owner",
    });

    const onClose = vi.fn();
    render(<QrLoginModal open onClose={onClose} />);
    await screen.findByText(/Ожидание сканирования/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    await waitFor(() => expect(exchangeSpy).toHaveBeenCalledWith(SESSION.sessionId, SESSION.qrToken));
    await waitFor(() => expect(applyTokens).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "access" }), true));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows the expired state with a working refresh button once the status reports Expired", async () => {
    const startSpy = vi.spyOn(qrAuthApi, "startQrLogin").mockResolvedValue(SESSION);
    vi.spyOn(qrAuthApi, "getQrLoginStatus").mockResolvedValueOnce({ status: "Pending" }).mockResolvedValue({ status: "Expired" });

    render(<QrLoginModal open onClose={vi.fn()} />);
    await screen.findByText(/Ожидание сканирования/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    const refreshButton = await screen.findByRole("button", { name: /Обновить QR-код/ });
    expect(startSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(refreshButton);
    await waitFor(() => expect(startSpy).toHaveBeenCalledTimes(2));
  });

  it("shows a network-error state if starting the session fails, and allows retry", async () => {
    const startSpy = vi
      .spyOn(qrAuthApi, "startQrLogin")
      .mockRejectedValueOnce(new ApiError("RATE_LIMITED", "Too many requests", 429, "trace-1"))
      .mockResolvedValue(SESSION);
    vi.spyOn(qrAuthApi, "getQrLoginStatus").mockResolvedValue({ status: "Pending" });

    render(<QrLoginModal open onClose={vi.fn()} />);

    await screen.findByText(/Слишком много попыток/);

    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Попробовать снова/ }));

    await waitFor(() => expect(startSpy).toHaveBeenCalledTimes(2));
    await screen.findByText(/Ожидание сканирования/);
  });
});

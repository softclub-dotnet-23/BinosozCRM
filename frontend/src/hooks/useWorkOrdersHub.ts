import { useEffect } from "react";
import { HubConnectionBuilder, HttpTransportType, LogLevel, type HubConnection } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { readAccessToken } from "../services/tokenStorage";

// VITE_API_BASE_URL is "http://host:port/api/v1" — the hub lives at the API host's root
// (Api/Program.cs: app.MapHub<WorkOrdersHub>("/hubs/work-orders")), not under /api/v1.
function resolveHubUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;
  const origin = apiBaseUrl.replace(/\/api\/v\d+\/?$/, "");
  return `${origin}/hubs/work-orders`;
}

let sharedConnection: HubConnection | null = null;
let refCount = 0;

/**
 * Api/Hubs/WorkOrdersHub.cs — company-scoped group, JWT via query-string (the backend's own
 * JwtBearerEvents.OnMessageReceived only accepts that fallback for this exact path, per
 * Program.cs's comment on why: browser WebSocket handshakes can't set an Authorization header).
 * Mounted once, at the ProtectedRoute shell — every protected page shares one connection rather
 * than opening/closing a socket per navigation. Invalidates the same React Query cache keys each
 * event's originating page already uses, so an update from another user's action (Prorab accepts
 * a work order, a material shortage gets reported) shows up without a manual refetch.
 */
export function useWorkOrdersHub(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    refCount += 1;

    if (!sharedConnection) {
      sharedConnection = new HubConnectionBuilder()
        .withUrl(resolveHubUrl(), {
          accessTokenFactory: () => readAccessToken() ?? "",
          transport: HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

      sharedConnection.on("WorkOrderStatusChanged", () => {
        queryClient.invalidateQueries({ queryKey: ["work-orders"] });
        queryClient.invalidateQueries({ queryKey: ["work-orders-mine"] });
      });

      sharedConnection.on("WorkOrderOverdue", () => {
        queryClient.invalidateQueries({ queryKey: ["work-orders"] });
        queryClient.invalidateQueries({ queryKey: ["work-orders-mine"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "work-status"] });
      });

      sharedConnection.on("MaterialShortageReported", () => {
        queryClient.invalidateQueries({ queryKey: ["material-requests"] });
        queryClient.invalidateQueries({ queryKey: ["material-consumption-reports"] });
      });

      sharedConnection.on("IndividualTaskOverdue", () => {
        queryClient.invalidateQueries({ queryKey: ["individual-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "work-status"] });
      });

      sharedConnection.start().catch(() => {
        // Best-effort — a failed initial connect (backend down, network blip) shouldn't crash
        // the app. withAutomaticReconnect only covers drops after a successful start, so this
        // catch is what keeps a failed first attempt from surfacing as an unhandled rejection;
        // pages fall back to their normal query-refetch/polling behavior either way.
      });
    }

    return () => {
      refCount -= 1;
      if (refCount <= 0 && sharedConnection) {
        const connection = sharedConnection;
        sharedConnection = null;
        connection.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}

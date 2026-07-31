import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type GetWorkStatusParams } from "../../services/dashboardApi";
import { useAuth } from "../../context/AuthContext";

/** GET /dashboard/work-status is [Authorize(Roles = "Owner,Prorab")] — Brigadir/Accountant get a
 * verified 403. `enabled` gates the request itself so those roles never fire it (and never see
 * the 403 surfaced as a generic app failure), matching §15's "For unsupported roles, do not make
 * the request" instruction — this isn't just a UI hide, the network call itself doesn't happen. */
export function useDashboardWorkStatus(params: GetWorkStatusParams = {}) {
  const { user } = useAuth();
  const allowed = (user?.isBackendSession ?? false) && (user?.role === "owner" || user?.role === "prorab");

  return useQuery({
    queryKey: ["dashboard", "work-status", params],
    queryFn: () => dashboardApi.getWorkStatus(params),
    enabled: allowed,
  });
}

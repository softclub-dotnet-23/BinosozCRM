import { request } from "./apiClient";

export interface StatusCount {
  status: string;
  count: number;
}

export interface DashboardWorkStatus {
  workOrderStatusCounts: StatusCount[];
  overdueWorkOrderCount: number;
}

export function getDashboardWorkStatus(objectId?: string, brigadeId?: string): Promise<DashboardWorkStatus> {
  const params = new URLSearchParams();
  if (objectId) params.set("objectId", objectId);
  if (brigadeId) params.set("brigadeId", brigadeId);
  const query = params.toString();
  return request<DashboardWorkStatus>(`/api/v1/dashboard/work-status${query ? `?${query}` : ""}`);
}

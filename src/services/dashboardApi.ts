import { apiClient } from "./apiClient";

// Application/Dashboard/DashboardWorkStatusDto.cs — StatusCountDto.status is manually
// .ToString()'d by the handler (verified: typed `string` on the record, not the raw enum), so
// unlike every other module's status field, this one really is a string on the wire.
export interface StatusCountDto {
  status: string;
  count: number;
}

export interface DashboardWorkStatusDto {
  workOrderStatusCounts: StatusCountDto[];
  individualTaskStatusCounts: StatusCountDto[];
  overdueWorkOrderCount: number;
  overdueIndividualTaskCount: number;
}

export interface GetWorkStatusParams {
  objectId?: string;
  brigadeId?: string;
}

// DashboardController — api/v1/dashboard. Owner,Prorab only; Brigadir/Accountant get a 403 —
// callers must not fire this request for those roles (see role-gating notes in dashboardApi
// consumers), not just hide the resulting UI.
export const dashboardApi = {
  getWorkStatus: (params: GetWorkStatusParams = {}) =>
    apiClient.get<DashboardWorkStatusDto>("/dashboard/work-status", { params }).then((r) => r.data),
};

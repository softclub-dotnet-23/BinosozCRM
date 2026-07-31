import { apiClient } from "./apiClient";
import type { PagedResult } from "./types";

// Application/Timesheets/TimesheetDto.cs — no status enum; state lives in the nullable
// CheckInAt/CheckOutAt/ApprovedAt timestamps.
export interface TimesheetDto {
  id: string;
  workerId: string;
  objectId: string;
  date: string;
  plannedStartTime: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number | null;
  hoursWorked: number | null;
  enteredManually: boolean;
  approvedByUserId: string | null;
  approvedAt: string | null;
}

export interface CreateManualTimesheetRequest {
  workerId: string;
  objectId: string;
  date: string;
  checkInAt: string;
  checkOutAt?: string | null;
}

export interface CheckInRequest {
  workerId: string;
  objectId: string;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// TimesheetsController — api/v1/timesheets. GET: Owner,Prorab,Brigadir (own, server-scoped).
// POST (manual/backdated entry): Owner,Prorab only — the live flow is check-in/check-out,
// both Brigadir-only. approve is Prorab-only (not Owner, despite the class-level default).
export const timesheetsApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<TimesheetDto>>("/timesheets", { params }).then((r) => r.data),

  get: (timesheetId: string) => apiClient.get<TimesheetDto>(`/timesheets/${timesheetId}`).then((r) => r.data),

  createManual: (request: CreateManualTimesheetRequest) =>
    apiClient.post<TimesheetDto>("/timesheets", request).then((r) => r.data),

  checkIn: (request: CheckInRequest) => apiClient.post<TimesheetDto>("/timesheets/check-in", request).then((r) => r.data),

  checkOut: (timesheetId: string) => apiClient.post<TimesheetDto>(`/timesheets/${timesheetId}/check-out`).then((r) => r.data),

  approve: (timesheetId: string) => apiClient.post<TimesheetDto>(`/timesheets/${timesheetId}/approve`).then((r) => r.data),
};

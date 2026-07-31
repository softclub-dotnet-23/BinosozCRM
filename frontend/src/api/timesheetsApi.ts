import { request, type PagedResult } from "./apiClient";

export interface Timesheet {
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

export function listTimesheets(page: number, pageSize: number): Promise<PagedResult<Timesheet>> {
  return request<PagedResult<Timesheet>>(`/api/v1/timesheets?page=${page}&pageSize=${pageSize}`);
}

export interface CreateManualTimesheetInput {
  workerId: string;
  objectId: string;
  date: string;
  checkInAt: string;
  checkOutAt?: string;
}

export function createManualTimesheet(input: CreateManualTimesheetInput): Promise<Timesheet> {
  return request<Timesheet>("/api/v1/timesheets", { method: "POST", body: input });
}

export function approveTimesheet(timesheetId: string): Promise<Timesheet> {
  return request<Timesheet>(`/api/v1/timesheets/${timesheetId}/approve`, { method: "POST" });
}

import { apiClient } from "./apiClient";
import type { PagedResult } from "./types";

// Application/PayrollAdvances/PayrollAdvanceDto.cs
export interface PayrollAdvanceDto {
  id: string;
  workerId: string;
  amount: number;
  issuedAt: string;
  issuedByUserId: string;
  note: string | null;
  settledInPayrollEntryId: string | null;
}

export interface CreatePayrollAdvanceRequest {
  workerId: string;
  amount: number;
  note?: string | null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// PayrollAdvancesController — api/v1/payroll-advances. GET: Owner,Accountant,Brigadir (own,
// server-scoped). Create: Owner,Accountant only (class-level default; not overridden for POST).
export const payrollAdvancesApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<PayrollAdvanceDto>>("/payroll-advances", { params }).then((r) => r.data),

  create: (request: CreatePayrollAdvanceRequest) =>
    apiClient.post<PayrollAdvanceDto>("/payroll-advances", request).then((r) => r.data),
};

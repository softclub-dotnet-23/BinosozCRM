import { apiClient } from "./apiClient";
import type { PagedResult, PayrollEntryStatus } from "./types";

// Application/Payroll/PayrollEntryDto.cs
export interface PayrollEntryDto {
  id: string;
  workerId: string;
  periodStart: string;
  periodEnd: string;
  calculatedAmount: number;
  latenessDeductionAmount: number;
  bonusAmount: number;
  advanceDeductedAmount: number;
  adjustmentAmount: number;
  adjustmentReason: string | null;
  finalAmount: number | null;
  status: PayrollEntryStatus;
  paidAt: string | null;
}

export interface CreatePayrollEntryRequest {
  workerId: string;
  periodStart: string;
  periodEnd: string;
}

export interface AdjustPayrollEntryRequest {
  adjustmentAmount: number;
  adjustmentReason?: string | null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// PayrollController — api/v1/payroll. GET: Owner,Accountant,Brigadir (own row, server-scoped).
// Create/Adjust: Accountant only. Approve/Pay: Owner,Accountant.
export const payrollApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<PayrollEntryDto>>("/payroll", { params }).then((r) => r.data),

  get: (payrollEntryId: string) => apiClient.get<PayrollEntryDto>(`/payroll/${payrollEntryId}`).then((r) => r.data),

  create: (request: CreatePayrollEntryRequest) => apiClient.post<PayrollEntryDto>("/payroll", request).then((r) => r.data),

  approve: (payrollEntryId: string) => apiClient.post<PayrollEntryDto>(`/payroll/${payrollEntryId}/approve`).then((r) => r.data),

  pay: (payrollEntryId: string) => apiClient.post<PayrollEntryDto>(`/payroll/${payrollEntryId}/pay`).then((r) => r.data),

  adjust: (payrollEntryId: string, request: AdjustPayrollEntryRequest) =>
    apiClient.post<PayrollEntryDto>(`/payroll/${payrollEntryId}/adjust`, request).then((r) => r.data),
};

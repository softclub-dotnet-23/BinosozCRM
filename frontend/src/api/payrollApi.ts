import { request, type PagedResult } from "./apiClient";

export type PayrollEntryStatus = "Draft" | "Approved" | "Paid";

export interface PayrollEntry {
  id: string;
  workerId: string;
  workerName: string | null;
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

export interface PayrollAdvance {
  id: string;
  workerId: string;
  amount: number;
  issuedAt: string;
  issuedByUserId: string;
  note: string | null;
  settledInPayrollEntryId: string | null;
}

export function listPayrollEntries(page: number, pageSize: number): Promise<PagedResult<PayrollEntry>> {
  return request<PagedResult<PayrollEntry>>(`/api/v1/payroll?page=${page}&pageSize=${pageSize}`);
}

export function createPayrollEntry(workerId: string, periodStart: string, periodEnd: string): Promise<PayrollEntry> {
  return request<PayrollEntry>("/api/v1/payroll", { method: "POST", body: { workerId, periodStart, periodEnd } });
}

export function approvePayrollEntry(id: string): Promise<PayrollEntry> {
  return request<PayrollEntry>(`/api/v1/payroll/${id}/approve`, { method: "POST" });
}

export function payPayrollEntry(id: string): Promise<PayrollEntry> {
  return request<PayrollEntry>(`/api/v1/payroll/${id}/pay`, { method: "POST" });
}

export function adjustPayrollEntry(id: string, adjustmentAmount: number, adjustmentReason?: string): Promise<PayrollEntry> {
  return request<PayrollEntry>(`/api/v1/payroll/${id}/adjust`, { method: "POST", body: { adjustmentAmount, adjustmentReason: adjustmentReason || null } });
}

export function listPayrollAdvances(page: number, pageSize: number): Promise<PagedResult<PayrollAdvance>> {
  return request<PagedResult<PayrollAdvance>>(`/api/v1/payroll-advances?page=${page}&pageSize=${pageSize}`);
}

export function createPayrollAdvance(workerId: string, amount: number, note?: string): Promise<PayrollAdvance> {
  return request<PayrollAdvance>("/api/v1/payroll-advances", { method: "POST", body: { workerId, amount, note: note || null } });
}

import { apiClient } from "./apiClient";
import type { PagedResult, PayRateType } from "./types";

// Application/Workers/WorkerDto.cs — PayRateType/PayRate/DocumentType/DocumentExpiryDate come
// back null for callers the backend doesn't grant full detail to (Prorab); Owner/Accountant see
// everything. Never assume a null here means "not set" — check the caller's own role instead.
export interface WorkerDto {
  id: string;
  brigadeId: string;
  userId: string | null;
  fullName: string;
  phone: string;
  birthDate: string;
  specialty: string | null;
  payRateType: PayRateType | null;
  payRate: number | null;
  shiftStartTime: string | null;
  documentType: string | null;
  documentExpiryDate: string | null;
  hireDate: string;
  terminationDate: string | null;
  isActive: boolean;
}

export interface CreateWorkerRequest {
  fullName: string;
  phone: string;
  birthDate: string;
  payRateType: PayRateType;
  payRate: number;
  hireDate: string;
  userId?: string | null;
  specialty?: string | null;
  shiftStartTime?: string | null;
  documentType?: string | null;
  documentExpiryDate?: string | null;
}

export interface ListBrigadeWorkersParams {
  page: number;
  pageSize: number;
  includeInactive?: boolean;
}

export interface ListWorkersParams {
  page: number;
  pageSize: number;
  includeInactive?: boolean;
  brigadeId?: string;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// WorkersController — api/v1. Owner,Prorab for brigade-scoped create/list/terminate;
// GET /workers (company-wide, for the /employees page) additionally allows Accountant;
// GET /brigades/mine/workers is Brigadir-only (their own crew roster).
export const workersApi = {
  listByBrigade: (brigadeId: string, params: ListBrigadeWorkersParams) =>
    apiClient.get<PagedResult<WorkerDto>>(`/brigades/${brigadeId}/workers`, { params }).then((r) => r.data),

  list: (params: ListWorkersParams) => apiClient.get<PagedResult<WorkerDto>>("/workers", { params }).then((r) => r.data),

  listMine: (params: ListParams) => apiClient.get<PagedResult<WorkerDto>>("/brigades/mine/workers", { params }).then((r) => r.data),

  create: (brigadeId: string, request: CreateWorkerRequest) =>
    apiClient.post<WorkerDto>(`/brigades/${brigadeId}/workers`, request).then((r) => r.data),

  // TerminateWorkerCommand returns Result (not Result<T>) — 200 with no body.
  terminate: (workerId: string, terminationDate: string) =>
    apiClient.put<void>(`/workers/${workerId}/terminate`, { terminationDate }).then((r) => r.data),
};

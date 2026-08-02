import { request, type PagedResult } from "./apiClient";

export type PayRateType = "Hourly" | "Piecework";

export interface Worker {
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

export function listBrigadeWorkers(brigadeId: string, page: number, pageSize: number, includeInactive = false): Promise<PagedResult<Worker>> {
  return request<PagedResult<Worker>>(`/api/v1/brigades/${brigadeId}/workers?page=${page}&pageSize=${pageSize}&includeInactive=${includeInactive}`);
}

/**
 * There is no company-wide "list all workers" endpoint — only per-brigade
 * (MASTER §9.4). This fans out one call per brigade, bounded by the number
 * of brigades (typically small), not by worker count — a deliberate,
 * disclosed compromise rather than an unbounded N+1.
 */
export async function listAllWorkers(brigadeIds: string[], includeInactive = false): Promise<Worker[]> {
  const pages = await Promise.all(brigadeIds.map((id) => listBrigadeWorkers(id, 1, 100, includeInactive)));
  return pages.flatMap((p) => p.items);
}

export interface CreateWorkerInput {
  fullName: string;
  phone: string;
  birthDate: string;
  payRateType: PayRateType;
  payRate: number;
  hireDate: string;
  specialty?: string;
}

export function createWorker(brigadeId: string, input: CreateWorkerInput): Promise<Worker> {
  return request<Worker>(`/api/v1/brigades/${brigadeId}/workers`, { method: "POST", body: input });
}

export function terminateWorker(workerId: string, terminationDate: string): Promise<Worker> {
  return request<Worker>(`/api/v1/workers/${workerId}/terminate`, { method: "PUT", body: { terminationDate } });
}

export interface ChangeWorkerPayRateInput {
  payRateType: PayRateType;
  payRate: number;
  effectiveFrom: string;
}

export function changeWorkerPayRate(workerId: string, input: ChangeWorkerPayRateInput): Promise<Worker> {
  return request<Worker>(`/api/v1/workers/${workerId}/pay-rate`, { method: "PUT", body: input });
}

/** Brigadir/Worker: their own linked Worker record, full details (own PayRate/Document*, unlike the masked view another role sees of someone else's). */
export function getMyWorkerProfile(): Promise<Worker> {
  return request<Worker>("/api/v1/workers/me");
}

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
 * Frontend-integration: GET /api/v1/workers — company-wide (Owner/Prorab/Accountant), added
 * because every `listAllWorkers` caller already passed literally every brigade id it had (see
 * that function below) just to reconstruct "all workers company-wide" via a per-brigade fan-out.
 * `brigadeId` narrows to one brigade — omit for the whole company.
 */
export function listWorkers(page: number, pageSize: number, includeInactive = false, brigadeId?: string): Promise<PagedResult<Worker>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), includeInactive: String(includeInactive) });
  if (brigadeId) params.set("brigadeId", brigadeId);
  return request<PagedResult<Worker>>(`/api/v1/workers?${params.toString()}`);
}

/**
 * Every caller (AttendancePage, PayrollPage, BrigadeCompositionPage, EmployeesPage) passes every
 * brigade id it has — i.e. always wants the whole company — so this is now the single real
 * GET /api/v1/workers call above instead of the one-request-per-brigade fan-out it used to be.
 * `brigadeIds` is kept for call-site compatibility but no longer used to scope the request.
 *
 * WorkersController clamps pageSize server-side to 100 (Math.Clamp(..., 1, 100)) — a single
 * pageSize=500 request silently comes back truncated to 100 items. Page through in chunks of
 * 100, using the first response's totalCount to know how many more pages are left.
 */
const MAX_PAGE_SIZE = 100;

export async function listAllWorkers(_brigadeIds: string[], includeInactive = false): Promise<Worker[]> {
  const first = await listWorkers(1, MAX_PAGE_SIZE, includeInactive);
  const items = [...first.items];

  const pageCount = Math.ceil(first.totalCount / MAX_PAGE_SIZE);
  for (let page = 2; page <= pageCount; page++) {
    const next = await listWorkers(page, MAX_PAGE_SIZE, includeInactive);
    items.push(...next.items);
  }

  return items;
}

/** Frontend-integration: GET /api/v1/brigades/mine/workers — a Brigadir's own crew roster.
 * Distinct from getMyWorkerProfile() (their own single Worker record) and getMyBrigade()
 * (brigadesApi.ts — the Brigade record itself, not its members). */
export function listMyBrigadeWorkers(page: number, pageSize: number): Promise<PagedResult<Worker>> {
  return request<PagedResult<Worker>>(`/api/v1/brigades/mine/workers?page=${page}&pageSize=${pageSize}`);
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

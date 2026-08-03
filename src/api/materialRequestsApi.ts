import { request, type PagedResult } from "./apiClient";

export type MaterialRequestStatus = "Requested" | "Approved" | "Ordered" | "PartiallyDelivered" | "Delivered" | "Rejected";

export interface MaterialRequest {
  id: string;
  objectId: string;
  brigadeId: string;
  requestedByUserId: string;
  materialName: string;
  unit: string;
  qty: number;
  qtyDelivered: number;
  status: MaterialRequestStatus;
  approvedByUserId: string | null;
  requestedAt: string;
  approvedAt: string | null;
  deliveredAt: string | null;
  comment: string | null;
  isOverDelivered: boolean;
}

/** Owner/Prorab: every request in their scope. Brigadir/Worker: only their own (RequestedByUserId == self). */
export function listMaterialRequests(page: number, pageSize: number): Promise<PagedResult<MaterialRequest>> {
  return request<PagedResult<MaterialRequest>>(`/api/v1/material-requests?page=${page}&pageSize=${pageSize}`);
}

export interface CreateMaterialRequestInput {
  objectId: string;
  materialName: string;
  unit: string;
  qty: number;
}

/** Brigadir/Worker: own brigade, resolved server-side from the caller's linked Worker row. */
export function createMaterialRequest(input: CreateMaterialRequestInput): Promise<MaterialRequest> {
  return request<MaterialRequest>("/api/v1/material-requests", { method: "POST", body: input });
}

export function approveMaterialRequest(id: string): Promise<MaterialRequest> {
  return request<MaterialRequest>(`/api/v1/material-requests/${id}/approve`, { method: "POST" });
}

export function rejectMaterialRequest(id: string): Promise<MaterialRequest> {
  return request<MaterialRequest>(`/api/v1/material-requests/${id}/reject`, { method: "POST" });
}

export function markMaterialRequestOrdered(id: string): Promise<MaterialRequest> {
  return request<MaterialRequest>(`/api/v1/material-requests/${id}/mark-ordered`, { method: "POST" });
}

export function forceCloseMaterialRequest(id: string, comment: string): Promise<MaterialRequest> {
  return request<MaterialRequest>(`/api/v1/material-requests/${id}/force-close`, { method: "POST", body: { comment } });
}

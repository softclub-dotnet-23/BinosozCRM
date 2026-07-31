import { apiClient } from "./apiClient";
import type { MaterialRequestStatus, PagedResult } from "./types";

// Application/Materials/MaterialRequestDto.cs
export interface MaterialRequestDto {
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
  /** MATERIAL_REQUEST_OVERDELIVERY is explicitly "200, not an error — a UI warning" per the
   * backend's own comment on this DTO; surface it, don't treat it as a failure. */
  isOverDelivered: boolean;
}

export interface CreateMaterialRequestRequest {
  objectId: string;
  materialName: string;
  unit: string;
  qty: number;
}

export interface ForceCloseMaterialRequestRequest {
  comment: string;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// MaterialRequestsController — api/v1/material-requests. Create is Brigadir-only;
// GET/approve/reject/mark-ordered/force-close are Owner,Prorab.
export const materialRequestsApi = {
  list: (params: ListParams) =>
    apiClient.get<PagedResult<MaterialRequestDto>>("/material-requests", { params }).then((r) => r.data),

  get: (materialRequestId: string) =>
    apiClient.get<MaterialRequestDto>(`/material-requests/${materialRequestId}`).then((r) => r.data),

  create: (request: CreateMaterialRequestRequest) =>
    apiClient.post<MaterialRequestDto>("/material-requests", request).then((r) => r.data),

  approve: (materialRequestId: string) =>
    apiClient.post<MaterialRequestDto>(`/material-requests/${materialRequestId}/approve`).then((r) => r.data),

  reject: (materialRequestId: string) =>
    apiClient.post<MaterialRequestDto>(`/material-requests/${materialRequestId}/reject`).then((r) => r.data),

  markOrdered: (materialRequestId: string) =>
    apiClient.post<MaterialRequestDto>(`/material-requests/${materialRequestId}/mark-ordered`).then((r) => r.data),

  forceClose: (materialRequestId: string, request: ForceCloseMaterialRequestRequest) =>
    apiClient.post<MaterialRequestDto>(`/material-requests/${materialRequestId}/force-close`, request).then((r) => r.data),
};

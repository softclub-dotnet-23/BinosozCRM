import { apiClient } from "./apiClient";
import type { PagedResult, WorkOrderStatus } from "./types";

// Application/WorkOrders/WorkOrderDto.cs
export interface WorkOrderDto {
  id: string;
  code: string;
  objectId: string;
  brigadeId: string;
  estimateItemId: string | null;
  title: string;
  unit: string;
  plannedQty: number;
  unitPrice: number;
  status: WorkOrderStatus;
  assignedDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  createdByUserId: string;
}

// Application/WorkOrders/WorkOrderProgressDto.cs — photoUrls are already freshly-signed,
// expiring URLs (still server-relative, route through resolveSignedFileUrl before use).
export interface WorkOrderProgressDto {
  id: string;
  workOrderId: string;
  reportedByUserId: string;
  reportedQty: number;
  photoUrls: string[];
  comment: string | null;
  reportedAt: string;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

export interface AddWorkOrderProgressRequest {
  reportedQty: number;
  comment?: string | null;
  photos?: File[];
}

// WorkOrdersController — api/v1/work-orders. List (Owner/Prorab) is out of scope here; this app
// only wires the Brigadir-reachable subset ("mine", start, submit, rework, progress upload) — the
// full Owner/Prorab lifecycle (assign/accept/reject/close) was not part of the requested module.
export const workOrdersApi = {
  listMine: (params: ListParams) => apiClient.get<PagedResult<WorkOrderDto>>("/work-orders/mine", { params }).then((r) => r.data),

  start: (workOrderId: string) => apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/start`).then((r) => r.data),

  submit: (workOrderId: string) => apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/submit`).then((r) => r.data),

  rework: (workOrderId: string) => apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/rework`).then((r) => r.data),

  // Api/Controllers/WorkOrdersController.cs's AddProgress reads [FromForm] fields directly (no
  // wrapper request DTO), so the multipart field names below match the action's parameter names.
  addProgress: (workOrderId: string, request: AddWorkOrderProgressRequest) => {
    const form = new FormData();
    form.append("reportedQty", String(request.reportedQty));
    if (request.comment) form.append("comment", request.comment);
    (request.photos ?? []).forEach((photo) => form.append("photos", photo));

    return apiClient.post<WorkOrderProgressDto>(`/work-orders/${workOrderId}/progress`, form).then((r) => r.data);
  },
};

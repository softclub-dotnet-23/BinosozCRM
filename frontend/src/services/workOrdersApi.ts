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

// Application/WorkOrders/TaskLogDto.cs — GET /work-orders/{id}/log. FromStatus/ToStatus are
// strings on the wire (TaskLog stores the transition as text, shared across entity types with
// different status enums), unlike WorkOrderDto.status which is the numeric enum.
export interface WorkOrderLogEntryDto {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedByUserId: string;
  changedAt: string;
  comment: string | null;
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

export interface CreateWorkOrderRequest {
  objectId: string;
  brigadeId: string;
  title: string;
  unit: string;
  plannedQty: number;
  unitPrice: number;
  estimateItemId?: string | null;
  dueDate?: string | null;
}

// WorkOrdersController — api/v1/work-orders. Create/List/Assign/Accept/Reject/Close: Owner,Prorab.
// Start/Submit/Rework/progress upload: Brigadir. Get/log: all three.
export const workOrdersApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<WorkOrderDto>>("/work-orders", { params }).then((r) => r.data),

  listMine: (params: ListParams) => apiClient.get<PagedResult<WorkOrderDto>>("/work-orders/mine", { params }).then((r) => r.data),

  get: (workOrderId: string) => apiClient.get<WorkOrderDto>(`/work-orders/${workOrderId}`).then((r) => r.data),

  create: (request: CreateWorkOrderRequest) => apiClient.post<WorkOrderDto>("/work-orders", request).then((r) => r.data),

  assign: (workOrderId: string, assignedDate?: string | null) =>
    apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/assign`, { assignedDate: assignedDate ?? null }).then((r) => r.data),

  start: (workOrderId: string) => apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/start`).then((r) => r.data),

  submit: (workOrderId: string) => apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/submit`).then((r) => r.data),

  accept: (workOrderId: string, completedDate?: string | null) =>
    apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/accept`, { completedDate: completedDate ?? null }).then((r) => r.data),

  reject: (workOrderId: string, reason: string) =>
    apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/reject`, { reason }).then((r) => r.data),

  rework: (workOrderId: string) => apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/rework`).then((r) => r.data),

  close: (workOrderId: string) => apiClient.post<WorkOrderDto>(`/work-orders/${workOrderId}/close`).then((r) => r.data),

  getLog: (workOrderId: string) => apiClient.get<WorkOrderLogEntryDto[]>(`/work-orders/${workOrderId}/log`).then((r) => r.data),

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

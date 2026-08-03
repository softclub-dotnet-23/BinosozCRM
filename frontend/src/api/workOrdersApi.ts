import { request, type PagedResult } from "./apiClient";

export type WorkOrderStatus = "New" | "Assigned" | "InProgress" | "OnReview" | "Accepted" | "Rejected" | "Closed";

export interface WorkOrder {
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

export interface TaskLogEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedByUserId: string;
  changedAt: string;
  comment: string | null;
}

export function listWorkOrders(page: number, pageSize: number): Promise<PagedResult<WorkOrder>> {
  return request<PagedResult<WorkOrder>>(`/api/v1/work-orders?page=${page}&pageSize=${pageSize}`);
}

/** Brigadir-only: work orders belonging to the caller's own brigade, resolved server-side from their linked Worker row. */
export function listMyWorkOrders(page: number, pageSize: number): Promise<PagedResult<WorkOrder>> {
  return request<PagedResult<WorkOrder>>(`/api/v1/work-orders/mine?page=${page}&pageSize=${pageSize}`);
}

export function getWorkOrder(workOrderId: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}`);
}

export interface CreateWorkOrderInput {
  objectId: string;
  brigadeId: string;
  title: string;
  unit: string;
  plannedQty: number;
  unitPrice: number;
  estimateItemId?: string;
  dueDate?: string;
}

export function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
  return request<WorkOrder>("/api/v1/work-orders", { method: "POST", body: input });
}

export function assignWorkOrder(workOrderId: string, assignedDate?: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}/assign`, { method: "POST", body: { assignedDate: assignedDate ?? null } });
}

export function acceptWorkOrder(workOrderId: string, completedDate?: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}/accept`, { method: "POST", body: { completedDate: completedDate ?? null } });
}

export function rejectWorkOrder(workOrderId: string, reason: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}/reject`, { method: "POST", body: { reason } });
}

export function closeWorkOrder(workOrderId: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}/close`, { method: "POST" });
}

/** Brigadir-only: Assigned → InProgress, own brigade. */
export function startWorkOrder(workOrderId: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}/start`, { method: "POST" });
}

/** Brigadir-only: InProgress → OnReview, own brigade. Backend rejects if no progress report exists yet. */
export function submitWorkOrderForReview(workOrderId: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}/submit`, { method: "POST" });
}

/** Brigadir-only: Rejected → InProgress, own brigade. */
export function reworkWorkOrder(workOrderId: string): Promise<WorkOrder> {
  return request<WorkOrder>(`/api/v1/work-orders/${workOrderId}/rework`, { method: "POST" });
}

export interface WorkOrderProgress {
  id: string;
  workOrderId: string;
  reportedByUserId: string;
  reportedQty: number;
  photoUrls: string[];
  comment: string | null;
  reportedAt: string;
}

export interface AddWorkOrderProgressInput {
  reportedQty: number;
  comment?: string;
  photos?: File[];
}

/** Brigadir-only, own brigade, only while InProgress. Multipart — ReportedQty/Comment as form fields, photos as files. */
export function addWorkOrderProgress(workOrderId: string, input: AddWorkOrderProgressInput): Promise<WorkOrderProgress> {
  const formData = new FormData();
  formData.append("reportedQty", String(input.reportedQty));
  if (input.comment) formData.append("comment", input.comment);
  for (const photo of input.photos ?? []) formData.append("photos", photo);
  return request<WorkOrderProgress>(`/api/v1/work-orders/${workOrderId}/progress`, { method: "POST", body: formData });
}

export function getWorkOrderLog(workOrderId: string): Promise<TaskLogEntry[]> {
  return request<TaskLogEntry[]>(`/api/v1/work-orders/${workOrderId}/log`);
}

/** Brigadir/Worker: own submitted progress reports across all work orders, newest first. */
export function listMyWorkOrderProgress(page: number, pageSize: number): Promise<PagedResult<WorkOrderProgress>> {
  return request<PagedResult<WorkOrderProgress>>(`/api/v1/work-orders/progress/mine?page=${page}&pageSize=${pageSize}`);
}

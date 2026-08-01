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

export function getWorkOrderLog(workOrderId: string): Promise<TaskLogEntry[]> {
  return request<TaskLogEntry[]>(`/api/v1/work-orders/${workOrderId}/log`);
}

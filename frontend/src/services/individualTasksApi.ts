import { apiClient } from "./apiClient";
import type { IndividualTaskStatus, PagedResult } from "./types";

// Application/IndividualTasks/IndividualTaskDto.cs — Status is a raw enum, numeric on the wire.
export interface IndividualTaskDto {
  id: string;
  code: string;
  workOrderId: string | null;
  brigadeId: string;
  assignedToWorkerId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: IndividualTaskStatus;
  startedAt: string | null;
  completedAt: string | null;
  completedEarly: boolean | null;
  bonusAmount: number | null;
  bonusApprovedByUserId: string | null;
  createdByUserId: string;
}

export interface CreateIndividualTaskRequest {
  assignedToWorkerId: string;
  title: string;
  description?: string | null;
  workOrderId?: string | null;
  dueAt?: string | null;
}

export interface CompleteIndividualTaskRequest {
  bonusAmount?: number | null;
}

export interface ApproveBonusRequest {
  overrideAmount?: number | null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// IndividualTasksController — api/v1/individual-tasks. Every action is Brigadir-only except
// bonus/approve (Owner, Prorab) — enforced server-side; these types don't re-encode that.
export const individualTasksApi = {
  list: (params: ListParams) =>
    apiClient.get<PagedResult<IndividualTaskDto>>("/individual-tasks", { params }).then((r) => r.data),

  get: (taskId: string) => apiClient.get<IndividualTaskDto>(`/individual-tasks/${taskId}`).then((r) => r.data),

  create: (request: CreateIndividualTaskRequest) =>
    apiClient.post<IndividualTaskDto>("/individual-tasks", request).then((r) => r.data),

  start: (taskId: string) => apiClient.post<IndividualTaskDto>(`/individual-tasks/${taskId}/start`).then((r) => r.data),

  complete: (taskId: string, request?: CompleteIndividualTaskRequest) =>
    apiClient.post<IndividualTaskDto>(`/individual-tasks/${taskId}/complete`, request).then((r) => r.data),

  approveBonus: (taskId: string, request?: ApproveBonusRequest) =>
    apiClient.post<IndividualTaskDto>(`/individual-tasks/${taskId}/bonus/approve`, request).then((r) => r.data),
};

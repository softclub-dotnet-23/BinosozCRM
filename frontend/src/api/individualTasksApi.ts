import { request, type PagedResult } from "./apiClient";

export type IndividualTaskStatus = "Assigned" | "InProgress" | "Done";

/** Matches Application/IndividualTasks/IndividualTaskDto.cs. */
export interface IndividualTask {
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

/** Brigadir: own brigade's tasks. Worker: narrower — only tasks with AssignedToWorkerId == own Worker row. */
export function listIndividualTasks(page: number, pageSize: number): Promise<PagedResult<IndividualTask>> {
  return request<PagedResult<IndividualTask>>(`/api/v1/individual-tasks?page=${page}&pageSize=${pageSize}`);
}

export function getIndividualTask(taskId: string): Promise<IndividualTask> {
  return request<IndividualTask>(`/api/v1/individual-tasks/${taskId}`);
}

/** Brigadir/Worker, own scope. Assigned → InProgress. */
export function startIndividualTask(taskId: string): Promise<IndividualTask> {
  return request<IndividualTask>(`/api/v1/individual-tasks/${taskId}/start`, { method: "POST" });
}

/** Brigadir/Worker, own scope. InProgress → Done. A Worker cannot propose a bonus for their own task (backend rejects it) — bonusAmount is Brigadir-only. */
export function completeIndividualTask(taskId: string, bonusAmount?: number): Promise<IndividualTask> {
  return request<IndividualTask>(`/api/v1/individual-tasks/${taskId}/complete`, {
    method: "POST",
    body: bonusAmount ? { bonusAmount } : undefined,
  });
}

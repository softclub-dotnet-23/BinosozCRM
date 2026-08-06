import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  individualTasksApi,
  type ApproveBonusRequest,
  type CompleteIndividualTaskRequest,
  type CreateIndividualTaskRequest,
  type ListParams,
} from "../../services/individualTasksApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

const individualTasksKey = (params: ListParams) => ["individual-tasks", params] as const;

export function useIndividualTasks(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: individualTasksKey(params),
    queryFn: () => individualTasksApi.list(params),
    enabled,
  });
}

export function useIndividualTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ["individual-tasks", "detail", taskId],
    queryFn: () => individualTasksApi.get(taskId!),
    enabled: Boolean(taskId),
  });
}

function useInvalidateIndividualTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["individual-tasks"] });
}

export function useCreateIndividualTask() {
  const { showToast } = useToast();
  const invalidate = useInvalidateIndividualTasks();
  return useMutation({
    mutationFn: (request: CreateIndividualTaskRequest) => individualTasksApi.create(request),
    onSuccess: () => {
      invalidate();
      showToast("Задача создана");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useStartIndividualTask() {
  const { showToast } = useToast();
  const invalidate = useInvalidateIndividualTasks();
  return useMutation({
    mutationFn: (taskId: string) => individualTasksApi.start(taskId),
    onSuccess: () => {
      invalidate();
      showToast("Задача начата");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useCompleteIndividualTask() {
  const { showToast } = useToast();
  const invalidate = useInvalidateIndividualTasks();
  return useMutation({
    mutationFn: ({ taskId, request }: { taskId: string; request?: CompleteIndividualTaskRequest }) =>
      individualTasksApi.complete(taskId, request),
    onSuccess: () => {
      invalidate();
      showToast("Задача завершена");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useApproveTaskBonus() {
  const { showToast } = useToast();
  const invalidate = useInvalidateIndividualTasks();
  return useMutation({
    mutationFn: ({ taskId, request }: { taskId: string; request?: ApproveBonusRequest }) =>
      individualTasksApi.approveBonus(taskId, request),
    onSuccess: () => {
      invalidate();
      showToast("Премия утверждена");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

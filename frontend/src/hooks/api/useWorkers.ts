import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  workersApi,
  type CreateWorkerRequest,
  type ListBrigadeWorkersParams,
  type ListParams,
  type ListWorkersParams,
} from "../../services/workersApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useWorkers(params: ListWorkersParams, enabled = true) {
  return useQuery({
    queryKey: ["workers", params],
    queryFn: () => workersApi.list(params),
    enabled,
  });
}

export function useBrigadeWorkers(brigadeId: string | undefined, params: ListBrigadeWorkersParams) {
  return useQuery({
    queryKey: ["workers", "brigade", brigadeId, params],
    queryFn: () => workersApi.listByBrigade(brigadeId!, params),
    enabled: Boolean(brigadeId),
  });
}

export function useMyBrigadeWorkers(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["workers", "mine", params],
    queryFn: () => workersApi.listMine(params),
    enabled,
  });
}

export function useCreateWorker() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ brigadeId, request }: { brigadeId: string; request: CreateWorkerRequest }) =>
      workersApi.create(brigadeId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      showToast("Сотрудник добавлен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useTerminateWorker() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, terminationDate }: { workerId: string; terminationDate: string }) =>
      workersApi.terminate(workerId, terminationDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      showToast("Сотрудник уволен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

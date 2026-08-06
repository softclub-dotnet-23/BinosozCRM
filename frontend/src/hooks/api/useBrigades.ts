import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { brigadesApi, type CreateBrigadeRequest, type ListParams } from "../../services/brigadesApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useBrigades(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["brigades", params],
    queryFn: () => brigadesApi.list(params),
    enabled,
  });
}

export function useCreateBrigade() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateBrigadeRequest) => brigadesApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      showToast("Бригада создана");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useAssignBrigadir() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ brigadeId, userId }: { brigadeId: string; userId: string | null }) =>
      brigadesApi.assignBrigadir(brigadeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      showToast("Бригадир назначен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useSetBrigadeActive() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ brigadeId, isActive }: { brigadeId: string; isActive: boolean }) =>
      brigadesApi.setActive(brigadeId, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      showToast(isActive ? "Бригада активирована" : "Бригада приостановлена");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

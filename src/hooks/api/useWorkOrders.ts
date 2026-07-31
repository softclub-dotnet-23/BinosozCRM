import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workOrdersApi, type AddWorkOrderProgressRequest, type ListParams } from "../../services/workOrdersApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useMyWorkOrders(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["work-orders-mine", params],
    queryFn: () => workOrdersApi.listMine(params),
    enabled,
  });
}

function useWorkOrderTransition(fn: (workOrderId: string) => Promise<unknown>, successMessage: string) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders-mine"] });
      showToast(successMessage);
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useStartWorkOrder() {
  return useWorkOrderTransition(workOrdersApi.start, "Наряд начат");
}

export function useSubmitWorkOrder() {
  return useWorkOrderTransition(workOrdersApi.submit, "Наряд отправлен на проверку");
}

export function useReworkWorkOrder() {
  return useWorkOrderTransition(workOrdersApi.rework, "Наряд возвращён в работу");
}

export function useAddWorkOrderProgress() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, request }: { workOrderId: string; request: AddWorkOrderProgressRequest }) =>
      workOrdersApi.addProgress(workOrderId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders-mine"] });
      showToast("Отчёт о прогрессе отправлен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

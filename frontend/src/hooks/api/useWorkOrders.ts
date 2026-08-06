import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workOrdersApi, type AddWorkOrderProgressRequest, type CreateWorkOrderRequest, type ListParams } from "../../services/workOrdersApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useMyWorkOrders(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["work-orders-mine", params],
    queryFn: () => workOrdersApi.listMine(params),
    enabled,
  });
}

export function useWorkOrders(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["work-orders", params],
    queryFn: () => workOrdersApi.list(params),
    enabled,
  });
}

export function useWorkOrderLog(workOrderId: string | undefined) {
  return useQuery({
    queryKey: ["work-orders", "log", workOrderId],
    queryFn: () => workOrdersApi.getLog(workOrderId!),
    enabled: Boolean(workOrderId),
  });
}

function useOwnerWorkOrderTransition(fn: (workOrderId: string) => Promise<unknown>, successMessage: string) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      showToast(successMessage);
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useCreateWorkOrder() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateWorkOrderRequest) => workOrdersApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      showToast("Наряд создан");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useAssignWorkOrder() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, assignedDate }: { workOrderId: string; assignedDate?: string | null }) =>
      workOrdersApi.assign(workOrderId, assignedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      showToast("Наряд назначен бригаде");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useAcceptWorkOrder() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, completedDate }: { workOrderId: string; completedDate?: string | null }) =>
      workOrdersApi.accept(workOrderId, completedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      showToast("Наряд принят");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useRejectWorkOrder() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, reason }: { workOrderId: string; reason: string }) => workOrdersApi.reject(workOrderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      showToast("Наряд отклонён");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useCloseWorkOrder() {
  return useOwnerWorkOrderTransition(workOrdersApi.close, "Наряд закрыт");
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

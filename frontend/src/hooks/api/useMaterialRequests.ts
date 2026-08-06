import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  materialRequestsApi,
  type CreateMaterialRequestRequest,
  type ForceCloseMaterialRequestRequest,
  type ListParams,
} from "../../services/materialRequestsApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useMaterialRequests(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["material-requests", params],
    queryFn: () => materialRequestsApi.list(params),
    enabled,
  });
}

function useInvalidateMaterialRequests() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["material-requests"] });
}

export function useCreateMaterialRequest() {
  const { showToast } = useToast();
  const invalidate = useInvalidateMaterialRequests();
  return useMutation({
    mutationFn: (request: CreateMaterialRequestRequest) => materialRequestsApi.create(request),
    onSuccess: (dto) => {
      invalidate();
      showToast(dto.isOverDelivered ? "Заявка создана (превышение поставки)" : "Заявка на материалы создана");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useApproveMaterialRequest() {
  const { showToast } = useToast();
  const invalidate = useInvalidateMaterialRequests();
  return useMutation({
    mutationFn: (materialRequestId: string) => materialRequestsApi.approve(materialRequestId),
    onSuccess: () => {
      invalidate();
      showToast("Заявка одобрена");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useRejectMaterialRequest() {
  const { showToast } = useToast();
  const invalidate = useInvalidateMaterialRequests();
  return useMutation({
    mutationFn: (materialRequestId: string) => materialRequestsApi.reject(materialRequestId),
    onSuccess: () => {
      invalidate();
      showToast("Заявка отклонена", "info");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useMarkMaterialRequestOrdered() {
  const { showToast } = useToast();
  const invalidate = useInvalidateMaterialRequests();
  return useMutation({
    mutationFn: (materialRequestId: string) => materialRequestsApi.markOrdered(materialRequestId),
    onSuccess: () => {
      invalidate();
      showToast("Заявка отмечена как заказанная");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useForceCloseMaterialRequest() {
  const { showToast } = useToast();
  const invalidate = useInvalidateMaterialRequests();
  return useMutation({
    mutationFn: ({ materialRequestId, request }: { materialRequestId: string; request: ForceCloseMaterialRequestRequest }) =>
      materialRequestsApi.forceClose(materialRequestId, request),
    onSuccess: () => {
      invalidate();
      showToast("Заявка закрыта принудительно", "info");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { materialDeliveriesApi, type CreateMaterialDeliveryRequest, type ListParams } from "../../services/materialDeliveriesApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useMaterialDeliveries(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["material-deliveries", params],
    queryFn: () => materialDeliveriesApi.list(params),
    enabled,
  });
}

export function useCreateMaterialDelivery() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateMaterialDeliveryRequest) => materialDeliveriesApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-deliveries"] });
      // A delivery can change the linked MaterialRequest's status/qtyDelivered — keep that list
      // from going stale even though this hook doesn't own it.
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      showToast("Поставка материалов зафиксирована");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

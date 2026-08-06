import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi, type CreateCustomerRequest, type ListParams } from "../../services/customersApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useCustomers(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => customersApi.list(params),
    enabled,
  });
}

export function useCreateCustomer() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateCustomerRequest) => customersApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showToast("Заказчик добавлен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

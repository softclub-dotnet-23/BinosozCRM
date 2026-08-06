import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payrollAdvancesApi, type CreatePayrollAdvanceRequest, type ListParams } from "../../services/payrollAdvancesApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function usePayrollAdvances(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["payroll-advances", params],
    queryFn: () => payrollAdvancesApi.list(params),
    enabled,
  });
}

export function useCreatePayrollAdvance() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreatePayrollAdvanceRequest) => payrollAdvancesApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-advances"] });
      showToast("Аванс выдан");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

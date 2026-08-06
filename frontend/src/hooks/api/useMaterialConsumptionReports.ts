import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { materialConsumptionReportsApi, type ListParams, type ReportMaterialConsumptionRequest } from "../../services/materialConsumptionReportsApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useMaterialConsumptionReports(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["material-consumption-reports", params],
    queryFn: () => materialConsumptionReportsApi.list(params),
    enabled,
  });
}

export function useReportMaterialConsumption() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ReportMaterialConsumptionRequest) => materialConsumptionReportsApi.report(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-consumption-reports"] });
      showToast("Отчёт о расходе материалов отправлен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

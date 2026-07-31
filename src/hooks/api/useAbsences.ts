import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { absencesApi, type CreateAbsenceRecordRequest, type ListParams } from "../../services/absencesApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useAbsences(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["absences", params],
    queryFn: () => absencesApi.list(params),
    enabled,
  });
}

export function useCreateAbsence() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateAbsenceRecordRequest) => absencesApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      showToast("Отсутствие зарегистрировано");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

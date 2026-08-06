import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companyApi, type UpdateCompanySettingsRequest } from "../../services/companyApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useCompany() {
  return useQuery({
    queryKey: ["company"],
    queryFn: () => companyApi.getCurrent(),
  });
}

export function useUpdateCompany() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateCompanySettingsRequest) => companyApi.updateCurrent(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      showToast("Настройки компании сохранены");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

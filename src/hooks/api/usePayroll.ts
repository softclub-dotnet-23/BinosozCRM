import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payrollApi, type AdjustPayrollEntryRequest, type CreatePayrollEntryRequest, type ListParams } from "../../services/payrollApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function usePayroll(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["payroll", params],
    queryFn: () => payrollApi.list(params),
    enabled,
  });
}

function useInvalidatePayroll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["payroll"] });
}

export function useCreatePayrollEntry() {
  const { showToast } = useToast();
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: (request: CreatePayrollEntryRequest) => payrollApi.create(request),
    onSuccess: () => {
      invalidate();
      showToast("Начисление создано");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useApprovePayrollEntry() {
  const { showToast } = useToast();
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: (payrollEntryId: string) => payrollApi.approve(payrollEntryId),
    onSuccess: () => {
      invalidate();
      showToast("Начисление утверждено");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function usePayPayrollEntry() {
  const { showToast } = useToast();
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: (payrollEntryId: string) => payrollApi.pay(payrollEntryId),
    onSuccess: () => {
      invalidate();
      showToast("Выплата произведена");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useAdjustPayrollEntry() {
  const { showToast } = useToast();
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: ({ payrollEntryId, request }: { payrollEntryId: string; request: AdjustPayrollEntryRequest }) =>
      payrollApi.adjust(payrollEntryId, request),
    onSuccess: () => {
      invalidate();
      showToast("Корректировка применена");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

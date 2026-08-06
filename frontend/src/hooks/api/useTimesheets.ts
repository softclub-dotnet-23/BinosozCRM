import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { timesheetsApi, type CheckInRequest, type CreateManualTimesheetRequest, type ListParams } from "../../services/timesheetsApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useTimesheets(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["timesheets", params],
    queryFn: () => timesheetsApi.list(params),
    enabled,
  });
}

function useInvalidateTimesheets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["timesheets"] });
}

export function useCreateManualTimesheet() {
  const { showToast } = useToast();
  const invalidate = useInvalidateTimesheets();
  return useMutation({
    mutationFn: (request: CreateManualTimesheetRequest) => timesheetsApi.createManual(request),
    onSuccess: () => {
      invalidate();
      showToast("Табель добавлен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useCheckIn() {
  const { showToast } = useToast();
  const invalidate = useInvalidateTimesheets();
  return useMutation({
    mutationFn: (request: CheckInRequest) => timesheetsApi.checkIn(request),
    onSuccess: () => {
      invalidate();
      showToast("Приход отмечен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useCheckOut() {
  const { showToast } = useToast();
  const invalidate = useInvalidateTimesheets();
  return useMutation({
    mutationFn: (timesheetId: string) => timesheetsApi.checkOut(timesheetId),
    onSuccess: () => {
      invalidate();
      showToast("Уход отмечен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useApproveTimesheet() {
  const { showToast } = useToast();
  const invalidate = useInvalidateTimesheets();
  return useMutation({
    mutationFn: (timesheetId: string) => timesheetsApi.approve(timesheetId),
    onSuccess: () => {
      invalidate();
      showToast("Табель утверждён");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

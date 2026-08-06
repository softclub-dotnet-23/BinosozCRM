import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  objectsApi,
  type CreateConstructionObjectRequest,
  type CreateEstimateItemRequest,
  type ListParams,
  type UpdateConstructionObjectRequest,
} from "../../services/objectsApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useObjects(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["objects", params],
    queryFn: () => objectsApi.list(params),
    enabled,
  });
}

export function useObject(objectId: string | undefined) {
  return useQuery({
    queryKey: ["objects", "detail", objectId],
    queryFn: () => objectsApi.get(objectId!),
    enabled: Boolean(objectId),
  });
}

export function useObjectCostBreakdown(objectId: string | undefined) {
  return useQuery({
    queryKey: ["objects", "cost-breakdown", objectId],
    queryFn: () => objectsApi.getCostBreakdown(objectId!),
    enabled: Boolean(objectId),
  });
}

export function useEstimateItems(objectId: string | undefined, params: ListParams) {
  return useQuery({
    queryKey: ["objects", "estimate-items", objectId, params],
    queryFn: () => objectsApi.listEstimateItems(objectId!, params),
    enabled: Boolean(objectId),
  });
}

export function useCreateObject() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateConstructionObjectRequest) => objectsApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      showToast("Объект создан");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useUpdateObject() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objectId, request }: { objectId: string; request: UpdateConstructionObjectRequest }) =>
      objectsApi.update(objectId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      showToast("Объект обновлён");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useCreateEstimateItem() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objectId, request }: { objectId: string; request: CreateEstimateItemRequest }) =>
      objectsApi.createEstimateItem(objectId, request),
    onSuccess: (_, { objectId }) => {
      queryClient.invalidateQueries({ queryKey: ["objects", "estimate-items", objectId] });
      showToast("Позиция сметы добавлена");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useAssignProrab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objectId, prorabUserId }: { objectId: string; prorabUserId: string }) =>
      objectsApi.assignProrab(objectId, prorabUserId),
    onSuccess: (_, { objectId }) => {
      queryClient.invalidateQueries({ queryKey: ["objects", "prorabs", objectId] });
      showToast("Прораб назначен");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useObjectProrabs(objectId: string | undefined, params: ListParams) {
  return useQuery({
    queryKey: ["objects", "prorabs", objectId, params],
    queryFn: () => objectsApi.listProrabs(objectId!, params),
    enabled: Boolean(objectId),
  });
}

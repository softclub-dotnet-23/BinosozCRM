import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi, type CreateUserRequest, type ListParams } from "../../services/usersApi";
import { normalizeApiError } from "../../services/apiError";
import { useToast } from "../useToast";

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsers(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.list(params),
    enabled,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["users"] });
}

export function useCreateUser() {
  const { showToast } = useToast();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (request: CreateUserRequest) => usersApi.create(request),
    onSuccess: () => {
      invalidate();
      showToast("Пользователь создан");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useBlockUser() {
  const { showToast } = useToast();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (userId: string) => usersApi.block(userId),
    onSuccess: () => {
      invalidate();
      showToast("Пользователь заблокирован");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

export function useUnblockUser() {
  const { showToast } = useToast();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (userId: string) => usersApi.unblock(userId),
    onSuccess: () => {
      invalidate();
      showToast("Пользователь разблокирован");
    },
    onError: (err) => showToast(normalizeApiError(err).message, "error"),
  });
}

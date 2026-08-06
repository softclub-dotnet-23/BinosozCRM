import { apiClient } from "./apiClient";
import type { PagedResult, Role } from "./types";

// Application/Users/UserDto.cs — Role is the numeric enum on the wire (no
// JsonStringEnumConverter here, unlike AuthTokensDto.Role).
export interface UserDto {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
}

// Application/Users/CreateUserCommand.cs's CreateUserResultDto — temporaryPassword is
// surfaced exactly once, in this response; the backend only ever persists its Argon2id hash.
export interface CreateUserResultDto {
  user: UserDto;
  temporaryPassword: string;
}

export interface CreateUserRequest {
  fullName: string;
  phone: string;
  role: Role;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// UsersController — api/v1/users. GET /me: any authenticated role. Everything else: Owner only.
export const usersApi = {
  getMe: () => apiClient.get<UserDto>("/users/me").then((r) => r.data),

  list: (params: ListParams) => apiClient.get<PagedResult<UserDto>>("/users", { params }).then((r) => r.data),

  create: (request: CreateUserRequest) => apiClient.post<CreateUserResultDto>("/users", request).then((r) => r.data),

  block: (userId: string) => apiClient.put<UserDto>(`/users/${userId}/block`).then((r) => r.data),

  unblock: (userId: string) => apiClient.put<UserDto>(`/users/${userId}/unblock`).then((r) => r.data),
};

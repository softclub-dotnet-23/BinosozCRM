import { request, type PagedResult } from "./apiClient";
import { mapBackendRole, type BackendRole } from "./authApi";
import type { UserRole } from "../types";

interface BackendUser {
  id: string;
  fullName: string;
  phone: string;
  role: BackendRole;
  isActive: boolean;
  forcePasswordChange: boolean;
}

export interface AppUser {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  forcePasswordChange: boolean;
}

interface CreateUserResponse {
  user: BackendUser;
  temporaryPassword: string;
}

export interface CreatedUser {
  user: AppUser;
  /** Shown to the Owner exactly once — the backend never returns it again after this response. */
  temporaryPassword: string;
}

function mapUser(user: BackendUser): AppUser {
  return { ...user, role: mapBackendRole(user.role) };
}

export async function listUsers(page: number, pageSize: number): Promise<PagedResult<AppUser>> {
  const result = await request<PagedResult<BackendUser>>(`/api/v1/users?page=${page}&pageSize=${pageSize}`);
  return { ...result, items: result.items.map(mapUser) };
}

export async function createUser(fullName: string, phone: string, role: BackendRole): Promise<CreatedUser> {
  const result = await request<CreateUserResponse>("/api/v1/users", {
    method: "POST",
    body: { fullName, phone, role },
  });
  return { user: mapUser(result.user), temporaryPassword: result.temporaryPassword };
}

export async function changeUserRole(userId: string, role: BackendRole): Promise<AppUser> {
  const user = await request<BackendUser>(`/api/v1/users/${userId}/role`, { method: "PUT", body: { role } });
  return mapUser(user);
}

export async function activateUser(userId: string): Promise<AppUser> {
  const user = await request<BackendUser>(`/api/v1/users/${userId}/activate`, { method: "POST" });
  return mapUser(user);
}

export async function deactivateUser(userId: string): Promise<AppUser> {
  const user = await request<BackendUser>(`/api/v1/users/${userId}/deactivate`, { method: "POST" });
  return mapUser(user);
}

/** Owner-only, company-scoped: sets a password the Owner chose. No credential is returned — the Owner supplied it, so there is nothing to display back. */
export function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  return request<void>(`/api/v1/users/${userId}/reset-password`, { method: "POST", body: { newPassword } });
}

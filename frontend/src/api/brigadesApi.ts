import { request, type PagedResult } from "./apiClient";

export interface Brigade {
  id: string;
  name: string;
  brigadirUserId: string | null;
  isActive: boolean;
}

/** Brigadir-only: the brigade linked to the authenticated user. */
export function getMyBrigade(): Promise<Brigade> {
  return request<Brigade>("/api/v1/brigades/mine");
}

export function listBrigades(page: number, pageSize: number): Promise<PagedResult<Brigade>> {
  return request<PagedResult<Brigade>>(`/api/v1/brigades?page=${page}&pageSize=${pageSize}`);
}

export function createBrigade(name: string): Promise<Brigade> {
  return request<Brigade>("/api/v1/brigades", { method: "POST", body: { name } });
}

export function assignBrigadir(brigadeId: string, userId: string | null): Promise<Brigade> {
  return request<Brigade>(`/api/v1/brigades/${brigadeId}/brigadir`, { method: "PUT", body: { userId } });
}

export function activateBrigade(brigadeId: string): Promise<Brigade> {
  return request<Brigade>(`/api/v1/brigades/${brigadeId}/activate`, { method: "POST" });
}

export function deactivateBrigade(brigadeId: string): Promise<Brigade> {
  return request<Brigade>(`/api/v1/brigades/${brigadeId}/deactivate`, { method: "POST" });
}

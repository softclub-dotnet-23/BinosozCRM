import { apiClient } from "./apiClient";
import type { PagedResult } from "./types";

// Application/Brigades/BrigadeDto.cs
export interface BrigadeDto {
  id: string;
  name: string;
  brigadirUserId: string | null;
  isActive: boolean;
}

export interface CreateBrigadeRequest {
  name: string;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// BrigadesController — api/v1/brigades. Create/list: Owner,Prorab. Assign brigadir: Owner only.
export const brigadesApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<BrigadeDto>>("/brigades", { params }).then((r) => r.data),

  create: (request: CreateBrigadeRequest) => apiClient.post<BrigadeDto>("/brigades", request).then((r) => r.data),

  assignBrigadir: (brigadeId: string, userId: string | null) =>
    apiClient.put<BrigadeDto>(`/brigades/${brigadeId}/brigadir`, { userId }).then((r) => r.data),

  setActive: (brigadeId: string, isActive: boolean) =>
    apiClient.put<BrigadeDto>(`/brigades/${brigadeId}/active`, { isActive }).then((r) => r.data),
};

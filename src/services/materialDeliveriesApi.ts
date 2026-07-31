import { apiClient } from "./apiClient";
import type { PagedResult } from "./types";

// Application/Materials/MaterialDeliveryDto.cs
export interface MaterialDeliveryDto {
  id: string;
  objectId: string;
  materialRequestId: string | null;
  materialName: string;
  unit: string;
  qty: number;
  unitCost: number;
  supplierName: string | null;
  deliveredAt: string;
}

export interface CreateMaterialDeliveryRequest {
  objectId: string;
  materialRequestId?: string | null;
  materialName: string;
  unit: string;
  qty: number;
  unitCost: number;
  supplierName?: string | null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// MaterialDeliveriesController — api/v1/material-deliveries. Owner,Prorab for everything
// (GET and POST both) — no Brigadir path at all.
export const materialDeliveriesApi = {
  list: (params: ListParams) =>
    apiClient.get<PagedResult<MaterialDeliveryDto>>("/material-deliveries", { params }).then((r) => r.data),

  get: (materialDeliveryId: string) =>
    apiClient.get<MaterialDeliveryDto>(`/material-deliveries/${materialDeliveryId}`).then((r) => r.data),

  create: (request: CreateMaterialDeliveryRequest) =>
    apiClient.post<MaterialDeliveryDto>("/material-deliveries", request).then((r) => r.data),
};

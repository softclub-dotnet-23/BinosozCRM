import { apiClient } from "./apiClient";
import type { ConstructionObjectStatus, PagedResult } from "./types";

// Application/Objects/ConstructionObjectDto.cs
export interface ConstructionObjectDto {
  id: string;
  name: string;
  address: string | null;
  customerId: string;
  status: ConstructionObjectStatus;
  startDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  budget: number | null;
}

export interface CreateConstructionObjectRequest {
  name: string;
  customerId: string;
  address?: string | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  budget?: number | null;
}

export interface UpdateConstructionObjectRequest {
  name: string;
  address?: string | null;
  status: ConstructionObjectStatus;
  startDate?: string | null;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  budget?: number | null;
}

// Application/Objects/EstimateItemDto.cs
export interface EstimateItemDto {
  id: string;
  objectId: string;
  workType: string;
  unit: string;
  plannedQty: number;
  plannedUnitPrice: number;
  stage: string | null;
}

export interface CreateEstimateItemRequest {
  workType: string;
  unit: string;
  plannedQty: number;
  plannedUnitPrice: number;
  stage?: string | null;
}

// Application/Objects/ProrabAssignmentDto.cs
export interface ProrabAssignmentDto {
  id: string;
  objectId: string;
  prorabUserId: string;
  assignedAt: string;
  assignedByUserId: string;
}

// Application/Objects/ObjectCostBreakdownDto.cs
export interface ObjectCostBreakdownDto {
  objectId: string;
  materialCost: number;
  pieceworkPayrollCost: number;
  hourlyPayrollCost: number;
  paidAbsencePayrollCost: number;
  totalCost: number;
  note: string;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// ObjectsController — api/v1/objects. Owner,Prorab for everything except
// POST/GET .../prorabs, which is Owner only (overriding the class default).
export const objectsApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<ConstructionObjectDto>>("/objects", { params }).then((r) => r.data),

  get: (objectId: string) => apiClient.get<ConstructionObjectDto>(`/objects/${objectId}`).then((r) => r.data),

  create: (request: CreateConstructionObjectRequest) =>
    apiClient.post<ConstructionObjectDto>("/objects", request).then((r) => r.data),

  update: (objectId: string, request: UpdateConstructionObjectRequest) =>
    apiClient.put<ConstructionObjectDto>(`/objects/${objectId}`, request).then((r) => r.data),

  listEstimateItems: (objectId: string, params: ListParams) =>
    apiClient.get<PagedResult<EstimateItemDto>>(`/objects/${objectId}/estimate-items`, { params }).then((r) => r.data),

  createEstimateItem: (objectId: string, request: CreateEstimateItemRequest) =>
    apiClient.post<EstimateItemDto>(`/objects/${objectId}/estimate-items`, request).then((r) => r.data),

  getCostBreakdown: (objectId: string) =>
    apiClient.get<ObjectCostBreakdownDto>(`/objects/${objectId}/cost-breakdown`).then((r) => r.data),

  listProrabs: (objectId: string, params: ListParams) =>
    apiClient.get<PagedResult<ProrabAssignmentDto>>(`/objects/${objectId}/prorabs`, { params }).then((r) => r.data),

  assignProrab: (objectId: string, prorabUserId: string) =>
    apiClient.post<ProrabAssignmentDto>(`/objects/${objectId}/prorabs`, { prorabUserId }).then((r) => r.data),
};

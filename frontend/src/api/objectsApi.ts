import { request, type PagedResult } from "./apiClient";

export type BackendObjectStatus = "Planned" | "InProgress" | "Suspended" | "Completed" | "Closed";

export interface ConstructionObject {
  id: string;
  name: string;
  address: string | null;
  customerId: string;
  status: BackendObjectStatus;
  startDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  budget: number | null;
}

export interface ObjectCostBreakdown {
  objectId: string;
  materialCost: number;
  pieceworkPayrollCost: number;
  hourlyPayrollCost: number;
  paidAbsencePayrollCost: number;
  totalCost: number;
  note: string;
}

export function listObjects(page: number, pageSize: number): Promise<PagedResult<ConstructionObject>> {
  return request<PagedResult<ConstructionObject>>(`/api/v1/objects?page=${page}&pageSize=${pageSize}`);
}

export function getObject(objectId: string): Promise<ConstructionObject> {
  return request<ConstructionObject>(`/api/v1/objects/${objectId}`);
}

export interface CreateObjectInput {
  name: string;
  customerId: string;
  address?: string;
  startDate?: string;
  plannedEndDate?: string;
  budget?: number;
}

export function createObject(input: CreateObjectInput): Promise<ConstructionObject> {
  return request<ConstructionObject>("/api/v1/objects", { method: "POST", body: input });
}

export interface UpdateObjectInput {
  name: string;
  address?: string;
  status: BackendObjectStatus;
  startDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  budget?: number;
}

export function updateObject(objectId: string, input: UpdateObjectInput): Promise<ConstructionObject> {
  return request<ConstructionObject>(`/api/v1/objects/${objectId}`, { method: "PUT", body: input });
}

export function getObjectCostBreakdown(objectId: string): Promise<ObjectCostBreakdown> {
  return request<ObjectCostBreakdown>(`/api/v1/objects/${objectId}/cost-breakdown`);
}

/** Matches Application/Objects/EstimateItemDto.cs — a per-object estimate line item (not a company-wide "Estimate" entity). */
export interface EstimateItem {
  id: string;
  objectId: string;
  workType: string;
  unit: string;
  plannedQty: number;
  plannedUnitPrice: number;
  stage: string | null;
}

export function getEstimateItems(objectId: string, page: number, pageSize: number): Promise<PagedResult<EstimateItem>> {
  return request<PagedResult<EstimateItem>>(`/api/v1/objects/${objectId}/estimate-items?page=${page}&pageSize=${pageSize}`);
}

export interface CreateEstimateItemInput {
  workType: string;
  unit: string;
  plannedQty: number;
  plannedUnitPrice: number;
  stage?: string;
}

export function createEstimateItem(objectId: string, input: CreateEstimateItemInput): Promise<EstimateItem> {
  return request<EstimateItem>(`/api/v1/objects/${objectId}/estimate-items`, { method: "POST", body: input });
}

/** Matches Application/Materials/StockBalanceDto.cs — computed on the fly from MaterialDelivery/MaterialConsumptionReport, not a stored entity. */
export interface StockBalanceItem {
  materialName: string;
  unit: string;
  totalDelivered: number;
  totalConsumed: number;
  balance: number;
}

export function getObjectStockBalance(objectId: string): Promise<StockBalanceItem[]> {
  return request<StockBalanceItem[]>(`/api/v1/objects/${objectId}/stock`);
}

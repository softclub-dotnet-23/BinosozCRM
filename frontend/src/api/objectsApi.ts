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

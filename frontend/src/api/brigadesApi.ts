import { request, type PagedResult } from './apiClient';
import type { WorkOrderStatus } from './workOrdersApi';

export interface Brigade {
  id: string;
  name: string;
  brigadirUserId: string | null;
  isActive: boolean;
  /** Resolved server-side only by getMyBrigade() — null for every other list/mutation response. */
  brigadirFullName: string | null;
}

export function listBrigades(
  page: number,
  pageSize: number,
): Promise<PagedResult<Brigade>> {
  return request<PagedResult<Brigade>>(
    `/api/v1/brigades?page=${page}&pageSize=${pageSize}`,
  );
}

export function getMyBrigade(): Promise<Brigade> {
  return request<Brigade>('/api/v1/brigades/mine');
}

export function createBrigade(name: string): Promise<Brigade> {
  return request<Brigade>('/api/v1/brigades', {
    method: 'POST',
    body: { name },
  });
}

export function assignBrigadir(
  brigadeId: string,
  userId: string | null,
): Promise<Brigade> {
  return request<Brigade>(`/api/v1/brigades/${brigadeId}/brigadir`, {
    method: 'PUT',
    body: { userId },
  });
}

export function activateBrigade(brigadeId: string): Promise<Brigade> {
  return request<Brigade>(`/api/v1/brigades/${brigadeId}/activate`, {
    method: 'POST',
  });
}

export function deactivateBrigade(brigadeId: string): Promise<Brigade> {
  return request<Brigade>(`/api/v1/brigades/${brigadeId}/deactivate`, {
    method: 'POST',
  });
}

/** Matches Application/Brigades/BrigadeAssignmentDto.cs — WorkOrder as the assignment, Amount = PlannedQty*UnitPrice. */
export interface BrigadeAssignment {
  brigadeId: string;
  brigadeName: string;
  objectId: string;
  objectName: string;
  title: string;
  amount: number;
  assignedDate: string | null;
  dueDate: string | null;
  status: WorkOrderStatus;
}

export function listBrigadeAssignments(
  brigadeId?: string,
): Promise<BrigadeAssignment[]> {
  return request<BrigadeAssignment[]>(
    `/api/v1/brigades/assignments${brigadeId ? `?brigadeId=${brigadeId}` : ''}`,
  );
}

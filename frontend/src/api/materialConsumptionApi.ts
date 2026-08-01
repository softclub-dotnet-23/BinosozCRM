import { request, type PagedResult } from "./apiClient";

export interface MaterialConsumptionReport {
  id: string;
  objectId: string;
  brigadeId: string;
  reportedByUserId: string;
  date: string;
  materialName: string;
  unit: string;
  qtyUsed: number;
  qtyShortage: number;
  comment: string | null;
}

/** Read-only from the web panel — POST is Brigadir-only (Telegram bot, MASTER §0/§12), Owner/Prorab only ever get R here. */
export function listMaterialConsumptionReports(page: number, pageSize: number): Promise<PagedResult<MaterialConsumptionReport>> {
  return request<PagedResult<MaterialConsumptionReport>>(`/api/v1/material-consumption-reports?page=${page}&pageSize=${pageSize}`);
}

import { apiClient } from "./apiClient";
import type { PagedResult } from "./types";

// Application/Materials/MaterialConsumptionReportDto.cs — no status enum on this one.
export interface MaterialConsumptionReportDto {
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

export interface ReportMaterialConsumptionRequest {
  objectId: string;
  date: string;
  materialName: string;
  unit: string;
  qtyUsed: number;
  qtyShortage: number;
  comment?: string | null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// MaterialConsumptionReportsController — api/v1/material-consumption-reports.
// POST is Brigadir-only; GET is Owner,Prorab.
export const materialConsumptionReportsApi = {
  list: (params: ListParams) =>
    apiClient.get<PagedResult<MaterialConsumptionReportDto>>("/material-consumption-reports", { params }).then((r) => r.data),

  report: (request: ReportMaterialConsumptionRequest) =>
    apiClient.post<MaterialConsumptionReportDto>("/material-consumption-reports", request).then((r) => r.data),
};

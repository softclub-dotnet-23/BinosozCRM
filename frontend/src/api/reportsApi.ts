import { request } from "./apiClient";

/** Matches Application/Reports/GetActualCostReportQuery.cs's ActualCostLineDto exactly. ObjectId is null only for the synthetic "Общие" line. */
export interface ActualCostLine {
  objectId: string | null;
  objectName: string;
  materialCost: number;
  pieceworkCost: number;
  hourlyCost: number;
  bonusAmount: number;
  advanceDeductedAmount: number;
  latenessDeductionAmount: number;
  adjustmentAmount: number;
  totalCost: number;
}

/** Matches ActualCostReportDto. TotalCost here is the backend's own sum of every line's TotalCost — never recomputed client-side. */
export interface ActualCostReport {
  periodStart: string;
  periodEnd: string;
  lines: ActualCostLine[];
  totalCost: number;
}

export function getActualCostReport(periodStart: string, periodEnd: string, signal?: AbortSignal): Promise<ActualCostReport> {
  return request<ActualCostReport>(`/api/v1/reports/actual-cost?periodStart=${periodStart}&periodEnd=${periodEnd}`, { signal });
}

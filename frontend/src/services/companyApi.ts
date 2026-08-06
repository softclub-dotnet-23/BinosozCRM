import { apiClient } from "./apiClient";

// Domain/Enums/PieceworkDistributionMode.cs / PayrollPeriodType.cs — numeric on the wire, same
// convention as every other backend enum (see services/types.ts's top-of-file note).
export const PieceworkDistributionMode = { Manual: 0, EqualAmongContributors: 1, ProportionalToHours: 2 } as const;
export type PieceworkDistributionMode = (typeof PieceworkDistributionMode)[keyof typeof PieceworkDistributionMode];

export const PayrollPeriodType = { Monthly: 0, SemiMonthly: 1 } as const;
export type PayrollPeriodType = (typeof PayrollPeriodType)[keyof typeof PayrollPeriodType];

// Application/Companies/CompanyDto.cs
export interface CompanyDto {
  id: string;
  name: string;
  pieceworkDistributionMode: PieceworkDistributionMode;
  latenessGraceMinutes: number;
  latenessNotifyThresholdMinutes: number;
  payrollPeriodType: PayrollPeriodType;
  defaultCurrency: string;
}

export interface UpdateCompanySettingsRequest {
  pieceworkDistributionMode: PieceworkDistributionMode;
  latenessGraceMinutes: number;
  latenessNotifyThresholdMinutes: number;
  payrollPeriodType: PayrollPeriodType;
  defaultCurrency: string;
}

// CompaniesController — api/v1/companies. GET current: any authenticated role. PUT current: Owner only.
export const companyApi = {
  getCurrent: () => apiClient.get<CompanyDto>("/companies/current").then((r) => r.data),

  updateCurrent: (request: UpdateCompanySettingsRequest) =>
    apiClient.put<CompanyDto>("/companies/current", request).then((r) => r.data),
};

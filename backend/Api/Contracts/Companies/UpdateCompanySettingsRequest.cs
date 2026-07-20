using Domain.Enums;

namespace Api.Contracts.Companies;

public sealed record UpdateCompanySettingsRequest(
    PieceworkDistributionMode PieceworkDistributionMode,
    int LatenessGraceMinutes,
    int LatenessNotifyThresholdMinutes,
    PayrollPeriodType PayrollPeriodType,
    string DefaultCurrency);

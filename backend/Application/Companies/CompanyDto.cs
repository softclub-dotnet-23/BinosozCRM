using Domain.Entities;
using Domain.Enums;

namespace Application.Companies;

public sealed record CompanyDto(
    Guid Id,
    string Name,
    PieceworkDistributionMode PieceworkDistributionMode,
    int LatenessGraceMinutes,
    int LatenessNotifyThresholdMinutes,
    PayrollPeriodType PayrollPeriodType,
    string DefaultCurrency)
{
    public static CompanyDto FromEntity(Company company) => new(
        company.Id,
        company.Name,
        company.PieceworkDistributionMode,
        company.LatenessGraceMinutes,
        company.LatenessNotifyThresholdMinutes,
        company.PayrollPeriodType,
        company.DefaultCurrency);
}

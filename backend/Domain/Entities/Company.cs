using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class Company : AuditableEntity, ISoftDelete
{
    public string Name { get; private set; } = null!;
    public PieceworkDistributionMode PieceworkDistributionMode { get; private set; } = PieceworkDistributionMode.Manual;
    public int LatenessGraceMinutes { get; private set; }
    public int LatenessNotifyThresholdMinutes { get; private set; } = 15;
    public PayrollPeriodType PayrollPeriodType { get; private set; } = PayrollPeriodType.Monthly;
    public string DefaultCurrency { get; private set; } = "TJS";
    public bool IsDeleted { get; set; }

    private Company() { }

    public static Company Create(Guid id, string name)
    {
        return new Company
        {
            Id = id,
            Name = name,
            PieceworkDistributionMode = PieceworkDistributionMode.Manual,
            LatenessGraceMinutes = 0,
            LatenessNotifyThresholdMinutes = 15,
            PayrollPeriodType = PayrollPeriodType.Monthly,
            DefaultCurrency = "TJS"
        };
    }

    public void UpdateSettings(
        PieceworkDistributionMode pieceworkDistributionMode,
        int latenessGraceMinutes,
        int latenessNotifyThresholdMinutes,
        PayrollPeriodType payrollPeriodType,
        string defaultCurrency)
    {
        PieceworkDistributionMode = pieceworkDistributionMode;
        LatenessGraceMinutes = latenessGraceMinutes;
        LatenessNotifyThresholdMinutes = latenessNotifyThresholdMinutes;
        PayrollPeriodType = payrollPeriodType;
        DefaultCurrency = defaultCurrency;
    }
}

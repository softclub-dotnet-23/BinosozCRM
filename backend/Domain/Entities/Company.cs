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
    public int NextCodeNumber { get; private set; } = 1;
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
            DefaultCurrency = "TJS",
            NextCodeNumber = 1
        };
    }

    // §5.11/§5.14: WorkOrder and IndividualTask share this one sequence
    // ("та же последовательность, что WorkOrder") — a per-company counter,
    // not per-entity. xmin on this entity (see CompanyConfiguration) turns a
    // race between two concurrent reservations into a catchable
    // DbUpdateConcurrencyException instead of a silently-duplicated code.
    public string ReserveNextCode()
    {
        var code = $"BR-{NextCodeNumber}";
        NextCodeNumber++;
        return code;
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

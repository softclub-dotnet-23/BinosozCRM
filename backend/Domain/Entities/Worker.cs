using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class Worker : AuditableEntity, ICompanyOwned, ISoftDelete
{
    private const int MinimumAgeYears = 18;

    public Guid CompanyId { get; private set; }
    public Guid BrigadeId { get; private set; }
    public Guid? UserId { get; private set; }
    public string FullName { get; private set; } = null!;
    public string Phone { get; private set; } = null!;
    public DateOnly BirthDate { get; private set; }
    public string? Specialty { get; private set; }
    public PayRateType PayRateType { get; private set; }
    public decimal PayRate { get; private set; }
    public TimeOnly? ShiftStartTime { get; private set; }
    public string? DocumentType { get; private set; }
    public DateOnly? DocumentExpiryDate { get; private set; }
    public DateOnly HireDate { get; private set; }
    public DateOnly? TerminationDate { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IsDeleted { get; set; }

    private Worker() { }

    public static Worker Create(
        Guid companyId,
        Guid brigadeId,
        string fullName,
        string phone,
        DateOnly birthDate,
        PayRateType payRateType,
        decimal payRate,
        DateOnly hireDate,
        Guid? userId = null,
        string? specialty = null,
        TimeOnly? shiftStartTime = null,
        string? documentType = null,
        DateOnly? documentExpiryDate = null)
    {
        if (AgeAt(birthDate, hireDate) < MinimumAgeYears)
            throw new ArgumentException($"Worker must be at least {MinimumAgeYears} on HireDate.", nameof(birthDate));
        ValidatePayRate(payRateType, payRate);

        return new Worker
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            BrigadeId = brigadeId,
            UserId = userId,
            FullName = fullName,
            Phone = phone,
            BirthDate = birthDate,
            Specialty = specialty,
            PayRateType = payRateType,
            PayRate = payRate,
            ShiftStartTime = shiftStartTime,
            DocumentType = documentType,
            DocumentExpiryDate = documentExpiryDate,
            HireDate = hireDate,
            IsActive = true
        };
    }

    public void Terminate(DateOnly terminationDate)
    {
        TerminationDate = terminationDate;
        IsActive = false;
    }

    // Worker-role checkpoint (docs/PROGRESS.md, post-MASTER addition): links
    // an *existing* Worker record to a login-capable User created afterward
    // — the realistic onboarding path, since Worker.Create's own UserId
    // parameter only covers linking at creation time (e.g. a Brigadir hired
    // with a login from day one). Re-linking an already-linked Worker is
    // rejected rather than silently overwritten — a second login taking
    // over someone else's attendance/payroll history is not a "change",
    // it's a distinct mistake that needs a human decision, not code.
    public Result LinkUser(Guid userId)
    {
        if (UserId is not null)
            return Result.Failure(new Error("WORKER_ALREADY_LINKED", "Worker is already linked to a user account."));

        UserId = userId;
        return Result.Success();
    }

    public void ChangePayRate(PayRateType payRateType, decimal payRate)
    {
        ValidatePayRate(payRateType, payRate);
        PayRateType = payRateType;
        PayRate = payRate;
    }

    internal static void ValidatePayRate(PayRateType payRateType, decimal payRate)
    {
        if (payRateType == PayRateType.Hourly && payRate <= 0)
            throw new ArgumentOutOfRangeException(nameof(payRate), "Hourly pay rate must be positive.");
        if (payRateType == PayRateType.Piecework && payRate < 0)
            throw new ArgumentOutOfRangeException(nameof(payRate), "Piecework pay rate cannot be negative.");
    }

    private static int AgeAt(DateOnly birthDate, DateOnly onDate)
    {
        var age = onDate.Year - birthDate.Year;
        if (birthDate > onDate.AddYears(-age))
            age--;
        return age;
    }
}

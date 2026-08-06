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

    public void ChangePayRate(PayRateType payRateType, decimal payRate)
    {
        PayRateType = payRateType;
        PayRate = payRate;
    }

    private static int AgeAt(DateOnly birthDate, DateOnly onDate)
    {
        var age = onDate.Year - birthDate.Year;
        if (birthDate > onDate.AddYears(-age))
            age--;
        return age;
    }
}

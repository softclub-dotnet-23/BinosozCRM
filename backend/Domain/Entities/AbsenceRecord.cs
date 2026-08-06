using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class AbsenceRecord : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid WorkerId { get; private set; }
    public DateOnly DateFrom { get; private set; }
    public DateOnly DateTo { get; private set; }
    public AbsenceType Type { get; private set; }
    public string? Reason { get; private set; }
    public bool IsPaid { get; private set; }
    public string? DocumentUrl { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public bool IsDeleted { get; set; }

    private AbsenceRecord() { }

    public static AbsenceRecord Create(
        Guid companyId,
        Guid workerId,
        DateOnly dateFrom,
        DateOnly dateTo,
        AbsenceType type,
        bool isPaid,
        string? reason = null,
        string? documentUrl = null)
    {
        return new AbsenceRecord
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            WorkerId = workerId,
            DateFrom = dateFrom,
            DateTo = dateTo,
            Type = type,
            IsPaid = isPaid,
            Reason = reason,
            DocumentUrl = documentUrl
        };
    }

    public void Approve(Guid approvedByUserId) => ApprovedByUserId = approvedByUserId;
}

using Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Api.Contracts.AbsenceRecords;

// Multipart form model (optional Document upload) — same reason as
// SubmitWorkOrderProgressRequest: IFormFile only binds from [FromForm],
// which needs a settable-property class.
public sealed class CreateAbsenceRecordRequest
{
    public Guid WorkerId { get; set; }
    public DateOnly DateFrom { get; set; }
    public DateOnly DateTo { get; set; }
    public AbsenceType Type { get; set; }
    public bool IsPaid { get; set; }
    public string? Reason { get; set; }
    public IFormFile? Document { get; set; }
}

using Microsoft.AspNetCore.Http;

namespace Api.Contracts.WorkOrders;

// Multipart form model — IFormFile only binds from [FromForm], which needs
// a settable-property class, not the record-with-positional-ctor style used
// elsewhere in Contracts.
public sealed class SubmitWorkOrderProgressRequest
{
    public decimal ReportedQty { get; set; }
    public string? Comment { get; set; }
    public List<IFormFile>? Photos { get; set; }
}

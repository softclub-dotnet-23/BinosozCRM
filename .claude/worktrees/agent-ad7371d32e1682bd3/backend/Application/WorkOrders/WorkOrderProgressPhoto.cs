namespace Application.WorkOrders;

// Framework-agnostic stand-in for an uploaded file — Application doesn't
// reference ASP.NET's IFormFile. The controller maps IFormFile -> this.
public sealed record WorkOrderProgressPhoto(Stream Content, string ContentType, long Length);

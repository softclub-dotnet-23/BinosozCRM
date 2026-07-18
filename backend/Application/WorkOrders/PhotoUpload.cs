namespace Application.WorkOrders;

// Framework-agnostic stand-in for an uploaded file — keeps IFormFile
// (ASP.NET-specific) out of the Application layer. The controller maps
// IFormFile -> PhotoUpload before sending the command.
public sealed record PhotoUpload(Stream Content, string ContentType, long Length);

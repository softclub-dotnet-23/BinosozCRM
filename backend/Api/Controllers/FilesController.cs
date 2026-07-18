using Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §11.9: photos live outside the web root and are only reachable
// through a signed, expiring URL — the signature+expiry in the query string
// *is* the authorization here, not a JWT. That's why this is
// [AllowAnonymous]: a URL embedded in an already-authenticated
// WorkOrderProgress response has to be fetchable directly (e.g. an <img>
// src, or the Telegram bot relaying it) without forwarding a bearer token.
[ApiController]
[Route("api/v1/files")]
[AllowAnonymous]
public sealed class FilesController(IFileStorageService fileStorage) : ControllerBase
{
    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key, [FromQuery] long exp, [FromQuery] string sig, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(sig) || !fileStorage.TryValidateSignedUrl(key, exp, sig))
            return NotFound();

        try
        {
            var (content, contentType) = await fileStorage.OpenReadAsync(key, cancellationToken);
            return File(content, contentType);
        }
        catch (Exception ex) when (ex is FileNotFoundException or InvalidOperationException)
        {
            return NotFound();
        }
    }
}

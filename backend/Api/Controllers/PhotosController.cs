using Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §11.9: signed, expiring download links — the signature itself is
// the access control, not a JWT (a browser <img> tag or a bot can't attach
// an Authorization header). An invalid or expired link reads as a plain
// 404, not a distinguishing error — no reason to tell a caller which part
// of their guess was wrong.
[ApiController]
[Route("api/v1/photos")]
[AllowAnonymous]
public sealed class PhotosController(IPhotoStorageService photoStorage) : ControllerBase
{
    [HttpGet("{storageKey}")]
    public IActionResult Get(string storageKey, [FromQuery] long exp, [FromQuery] string sig)
    {
        if (string.IsNullOrEmpty(sig) || !photoStorage.ValidateSignature(storageKey, exp, sig))
            return NotFound();

        Stream stream;
        try
        {
            stream = photoStorage.OpenRead(storageKey);
        }
        catch (Exception ex) when (ex is FileNotFoundException or ArgumentException or DirectoryNotFoundException)
        {
            return NotFound();
        }

        var contentType = Path.GetExtension(storageKey).ToLowerInvariant() switch
        {
            ".jpg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };

        return File(stream, contentType);
    }
}

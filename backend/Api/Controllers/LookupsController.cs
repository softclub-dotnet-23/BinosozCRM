using Api.Common;
using Application.Lookups;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// Frontend-facing GUID-to-name resolution. Responses deliberately contain
// only LookupItemDto values: { id, name }, never a Worker/Object entity.
[ApiController]
[Route("api/v1/lookups")]
[Authorize(Roles = "Owner,Prorab,Brigadir")]
public sealed class LookupsController(ISender sender) : ControllerBase
{
    [HttpGet("workers")]
    public async Task<IActionResult> ListWorkers(
        [FromQuery] Guid[]? ids,
        [FromQuery] string? search,
        [FromQuery] int? limit,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new ListWorkerLookupsQuery(ids, search, Math.Clamp(limit ?? 20, 1, 100)),
            cancellationToken);

        return result.ToActionResult(HttpContext);
    }

    [HttpGet("objects")]
    public async Task<IActionResult> ListObjects(
        [FromQuery] Guid[]? ids,
        [FromQuery] string? search,
        [FromQuery] int? limit,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new ListObjectLookupsQuery(ids, search, Math.Clamp(limit ?? 20, 1, 100)),
            cancellationToken);

        return result.ToActionResult(HttpContext);
    }
}

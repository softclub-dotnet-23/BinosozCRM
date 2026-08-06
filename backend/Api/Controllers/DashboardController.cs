using Api.Common;
using Application.Dashboard;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§8.6: GET /dashboard/work-status — Prorab+.
[ApiController]
[Route("api/v1/dashboard")]
[Authorize(Roles = "Owner,Prorab")]
public sealed class DashboardController(ISender sender) : ControllerBase
{
    [HttpGet("work-status")]
    public async Task<IActionResult> GetWorkStatus([FromQuery] Guid? objectId, [FromQuery] Guid? brigadeId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetDashboardWorkStatusQuery(objectId, brigadeId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

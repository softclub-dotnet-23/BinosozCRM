using Api.Common;
using Api.Contracts.Brigades;
using Application.Brigades;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: create/list are "Prorab+" (Owner, Prorab); assigning the
// brigadir is "Owner" only — a stricter gate than Brigade's general CRU in
// §12, deliberately, per the resolution logged in PROGRESS.md for this step.
[ApiController]
[Route("api/v1/brigades")]
[Authorize]
public sealed class BrigadesController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Create(CreateBrigadeRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CreateBrigadeCommand(request.Name), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListBrigadesQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("{brigadeId:guid}/brigadir")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> AssignBrigadir(Guid brigadeId, AssignBrigadirRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AssignBrigadirCommand(brigadeId, request.UserId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

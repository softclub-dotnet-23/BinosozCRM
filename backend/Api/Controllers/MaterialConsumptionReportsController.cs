using Api.Common;
using Api.Contracts.Materials;
using Application.Materials;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§8.2: POST /material-consumption-reports — Brigadir(C), own
// brigade. GET — Prorab+(R) only, per §9.4's literal split.
[ApiController]
[Route("api/v1/material-consumption-reports")]
[Authorize]
public sealed class MaterialConsumptionReportsController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Report(ReportMaterialConsumptionRequest request, CancellationToken cancellationToken)
    {
        var command = new ReportMaterialConsumptionCommand(
            request.ObjectId,
            request.Date,
            request.MaterialName,
            request.Unit,
            request.QtyUsed,
            request.QtyShortage,
            request.Comment);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListMaterialConsumptionReportsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

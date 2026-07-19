using Api.Common;
using Api.Contracts.MaterialConsumptionReports;
using Application.MaterialConsumptionReports;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: "GET,POST /material-consumption-reports Brigadir(C) /
// Prorab+(R)" — asymmetric on purpose: Brigadir only ever writes today's
// report, Prorab+ only ever reads the history. No overlap, unlike
// Timesheet's more symmetric split.
[ApiController]
[Route("api/v1/material-consumption-reports")]
public sealed class MaterialConsumptionReportsController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Upsert(UpsertMaterialConsumptionReportRequest request, CancellationToken cancellationToken)
    {
        var command = new UpsertMaterialConsumptionReportCommand(
            request.ObjectId, request.MaterialName, request.Unit, request.QtyUsed, request.QtyShortage, request.Comment);

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

    [HttpGet("{reportId:guid}")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Get(Guid reportId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetMaterialConsumptionReportQuery(reportId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

using Api.Common;
using Application.Reports;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize(Roles = "Owner,Prorab,Accountant")]
public sealed class ReportsController(ISender sender) : ControllerBase
{
    [HttpGet("actual-cost")]
    public async Task<IActionResult> ActualCost([FromQuery] DateOnly periodStart, [FromQuery] DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetActualCostReportQuery(periodStart, periodEnd), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

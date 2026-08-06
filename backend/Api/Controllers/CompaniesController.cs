using Api.Common;
using Api.Contracts.Companies;
using Application.Companies;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET /companies/current — auth (any authenticated role, read
// own company's settings). PUT /companies/current — Owner only, overriding
// the class default: §5.1's thresholds/mode are meant to change "без
// деплоя", but only for the one role that owns that decision.
[ApiController]
[Route("api/v1/companies")]
[Authorize]
public sealed class CompaniesController(ISender sender) : ControllerBase
{
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetCurrentCompanyQuery(), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("current")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdateCurrent(UpdateCompanySettingsRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateCompanySettingsCommand(
            request.PieceworkDistributionMode,
            request.LatenessGraceMinutes,
            request.LatenessNotifyThresholdMinutes,
            request.PayrollPeriodType,
            request.DefaultCurrency);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

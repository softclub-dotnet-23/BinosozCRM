using Api.Common;
using Api.Contracts.PayrollAdvances;
using Application.PayrollAdvances;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /payroll-advances — Accountant, Owner. §12 agrees
// (both CRUA) — no §9.4-vs-§12 conflict this time, unlike Payroll's own
// Create. Brigadir added back on List only, for "R (свои)".
[ApiController]
[Route("api/v1/payroll-advances")]
[Authorize(Roles = "Owner,Accountant")]
public sealed class PayrollAdvancesController(ISender sender) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Owner,Accountant,Brigadir")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListPayrollAdvancesQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreatePayrollAdvanceRequest request, CancellationToken cancellationToken)
    {
        var command = new CreatePayrollAdvanceCommand(request.WorkerId, request.Amount, request.Note);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

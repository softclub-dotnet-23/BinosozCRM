using Api.Common;
using Api.Contracts.Payroll;
using Application.Payroll;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§8.8: GET,POST /payroll-advances — Accountant, Owner.
[ApiController]
[Route("api/v1/payroll-advances")]
[Authorize(Roles = "Owner,Accountant")]
public sealed class PayrollAdvancesController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Issue(IssuePayrollAdvanceRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new IssuePayrollAdvanceCommand(request.WorkerId, request.Amount, request.Note), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListPayrollAdvancesQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

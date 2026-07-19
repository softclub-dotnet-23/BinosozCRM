using Api.Common;
using Api.Contracts.Payroll;
using Application.Payroll;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§12: List/Get open to Owner, Accountant, and Brigadir (own
// row only, enforced in the handlers). Create is Accountant-only, per §12's
// literal role matrix (Owner is R+A there, not C) — an explicit business
// decision, since §9.4's endpoint list names Owner for POST too; see
// PROGRESS.md Phase 5 Step 3.
[ApiController]
[Route("api/v1/payroll")]
[Authorize(Roles = "Owner,Accountant,Brigadir")]
public sealed class PayrollController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListPayrollEntriesQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{payrollEntryId:guid}")]
    public async Task<IActionResult> Get(Guid payrollEntryId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetPayrollEntryQuery(payrollEntryId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost]
    [Authorize(Roles = "Accountant")]
    public async Task<IActionResult> Create(CreatePayrollEntryRequest request, CancellationToken cancellationToken)
    {
        var command = new CreatePayrollEntryCommand(request.WorkerId, request.PeriodStart, request.PeriodEnd);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

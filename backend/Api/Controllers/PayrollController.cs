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
// PROGRESS.md Phase 5 Step 3. Approve/Pay are Owner+Accountant, per §9.4's
// literal text and §12's "RA" for Owner (the "A" is exactly this) — no
// conflict this time, unlike Create. Adjust is Accountant-only too — §12's
// "U" belongs to Accountant alone (Owner's "RA" has no "U"), and §9.4
// names no endpoint for it at all (Phase 5 Step 11, PROGRESS.md).
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

    [HttpPost("{payrollEntryId:guid}/approve")]
    [Authorize(Roles = "Owner,Accountant")]
    public async Task<IActionResult> Approve(Guid payrollEntryId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApprovePayrollEntryCommand(payrollEntryId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{payrollEntryId:guid}/pay")]
    [Authorize(Roles = "Owner,Accountant")]
    public async Task<IActionResult> Pay(Guid payrollEntryId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new PayPayrollEntryCommand(payrollEntryId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{payrollEntryId:guid}/adjust")]
    [Authorize(Roles = "Accountant")]
    public async Task<IActionResult> Adjust(Guid payrollEntryId, AdjustPayrollEntryRequest request, CancellationToken cancellationToken)
    {
        var command = new AdjustPayrollEntryCommand(payrollEntryId, request.AdjustmentAmount, request.AdjustmentReason);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

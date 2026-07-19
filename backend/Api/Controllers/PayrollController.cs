using Api.Common;
using Api.Contracts.Payroll;
using Application.Payroll;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /payroll — Accountant, Owner. POST generates or
// recomputes the Draft PayrollEntry set for a period. /approve folds in
// an optional AdjustmentAmount/AdjustmentReason (§9.4 has no separate
// /adjust route, and Adjust() is Draft-only anyway) and settles every
// PayrollAdvance that fed AdvanceDeductedAmount. /pay is terminal —
// Paid is irreversible per §7.4.
[ApiController]
[Route("api/v1/payroll")]
[Authorize(Roles = "Owner,Accountant")]
public sealed class PayrollController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> GenerateDraft(GeneratePayrollDraftRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GeneratePayrollDraftCommand(request.PeriodStart, request.PeriodEnd), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListPayrollEntriesQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{payrollEntryId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid payrollEntryId, ApprovePayrollEntryRequest? request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new ApprovePayrollEntryCommand(payrollEntryId, request?.AdjustmentAmount, request?.AdjustmentReason),
            cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{payrollEntryId:guid}/pay")]
    public async Task<IActionResult> Pay(Guid payrollEntryId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new PayPayrollEntryCommand(payrollEntryId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

using Api.Common;
using Api.Contracts.Payroll;
using Application.Payroll;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /payroll — Accountant, Owner. POST generates or
// recomputes the Draft PayrollEntry set for a period (§8.0's
// CalculatedAmount only, this step — LatenessDeductionAmount/BonusAmount/
// AdvanceDeductedAmount/Approve are later Phase 5 steps).
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
}

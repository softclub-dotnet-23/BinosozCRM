using Api.Common;
using Api.Contracts.WorkOrderPayoutShares;
using Application.WorkOrderPayoutShares;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§12: PUT is Brigadir-only (own brigade, checked in the
// handler). GET defaults to "Owner,Prorab,Accountant" here; Brigadir is
// added back per-action where §12 grants "own" read. /approve is
// Prorab-only, strictly per §12's literal row (`WorkOrderPayoutShare | R |
// RA | ...` — Owner has no A here, unlike almost every other entity where
// Owner ⊇ Prorab). Explicit decision, not the codebase's usual "Owner can
// do anything Prorab can" default — see PROGRESS.md Phase 5 Step 1.
[ApiController]
[Route("api/v1/work-orders/{workOrderId:guid}/payout-shares")]
[Authorize(Roles = "Owner,Prorab,Accountant")]
public sealed class WorkOrderPayoutSharesController(ISender sender) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Owner,Prorab,Accountant,Brigadir")]
    public async Task<IActionResult> List(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListWorkOrderPayoutSharesQuery(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Set(Guid workOrderId, SetWorkOrderPayoutSharesRequest request, CancellationToken cancellationToken)
    {
        var shares = request.Shares.Select(s => new WorkOrderPayoutShareInput(s.WorkerId, s.SharePercent)).ToList();
        var result = await sender.Send(new SetWorkOrderPayoutSharesCommand(workOrderId, shares), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("approve")]
    [Authorize(Roles = "Prorab")]
    public async Task<IActionResult> Approve(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveWorkOrderPayoutSharesCommand(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

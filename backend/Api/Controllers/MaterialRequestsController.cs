using Api.Common;
using Api.Contracts.Materials;
using Application.Materials;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§7.3: POST /material-requests — Brigadir(C), own brigade.
// GET — Prorab+(R). /approve, /reject, /mark-ordered — Prorab+.
// /mark-ordered isn't in §9.4's literal table (only /approve, /reject,
// /force-close are) — added anyway, same class of gap as WorkOrder's
// /assign, /start (Phase 2 Step 1): without it, Approved -> Ordered is
// unreachable via the API, and MaterialDelivery.RecordDelivery (Step 3)
// requires exactly that status. /force-close is still not exposed —
// MASTER §8.2 requires "обязательный комментарий (пишется в
// AdminAuditLog)", but AdminAuditAction's enum (§5.16) has no matching
// action and MaterialRequest has no field to hold the comment itself —
// a real MASTER/Domain gap, flagged in PROGRESS.md, not silently worked
// around.
[ApiController]
[Route("api/v1/material-requests")]
[Authorize]
public sealed class MaterialRequestsController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Create(CreateMaterialRequestRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateMaterialRequestCommand(request.ObjectId, request.MaterialName, request.Unit, request.Qty);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListMaterialRequestsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{materialRequestId:guid}/approve")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Approve(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveMaterialRequestCommand(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{materialRequestId:guid}/reject")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Reject(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new RejectMaterialRequestCommand(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{materialRequestId:guid}/mark-ordered")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> MarkOrdered(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new MarkMaterialRequestOrderedCommand(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{materialRequestId:guid}")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Get(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetMaterialRequestQuery(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // MASTER §7.3/§9.4: "недопоставка, комментарий обязателен" — the
    // Comment/ForceDeliver(comment) gap this codebase's own history flagged
    // as unresolved (see Domain/Entities/MaterialRequest.cs) is closed as of
    // this merge, so this endpoint can finally exist.
    [HttpPost("{materialRequestId:guid}/force-close")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> ForceClose(
        Guid materialRequestId, ForceCloseMaterialRequestRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ForceCloseMaterialRequestCommand(materialRequestId, request.Comment), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

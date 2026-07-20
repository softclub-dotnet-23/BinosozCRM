using Api.Common;
using Api.Contracts.WorkOrders;
using Application.WorkOrders;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§7.1: GET,POST /work-orders — Prorab+. Transition endpoints
// (Phase 2 Step 3) now wired: TaskLog is written in the same transaction as
// every transition (Application.Common.TaskLogWriter). /assign and /start
// aren't in §9.4's literal endpoint table (only /submit, /accept|/reject,
// /log are) — added anyway, decided with the user, since without them a
// WorkOrder can never leave New via the API and /submit could never
// succeed. Flagged for MASTER.md reconciliation. /rework (Brigadir) and
// /close (Prorab+ manual half — the automatic half lives in
// WorkOrderAutoCloser, off PayrollEntry.Paid) closed the last punch-list
// gap from Phase 6 Step 9's reconciliation.
[ApiController]
[Route("api/v1/work-orders")]
[Authorize]
public sealed class WorkOrdersController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Create(CreateWorkOrderRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateWorkOrderCommand(
            request.ObjectId,
            request.BrigadeId,
            request.Title,
            request.Unit,
            request.PlannedQty,
            request.UnitPrice,
            request.EstimateItemId,
            request.DueDate);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListWorkOrdersQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> ListMine([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListMyWorkOrdersQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/assign")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Assign(Guid workOrderId, AssignWorkOrderRequest request, CancellationToken cancellationToken)
    {
        var assignedDate = request.AssignedDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await sender.Send(new AssignWorkOrderCommand(workOrderId, assignedDate), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/start")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Start(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new StartWorkOrderCommand(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/submit")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Submit(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new SubmitWorkOrderForReviewCommand(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/accept")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Accept(Guid workOrderId, AcceptWorkOrderRequest request, CancellationToken cancellationToken)
    {
        var completedDate = request.CompletedDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await sender.Send(new AcceptWorkOrderCommand(workOrderId, completedDate), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/reject")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Reject(Guid workOrderId, RejectWorkOrderRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new RejectWorkOrderCommand(workOrderId, request.Reason), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/rework")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Rework(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ReworkWorkOrderCommand(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/close")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Close(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CloseWorkOrderCommand(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{workOrderId:guid}/log")]
    [Authorize(Roles = "Owner,Prorab,Brigadir")]
    public async Task<IActionResult> GetLog(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetWorkOrderLogQuery(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // MASTER §5.12/§11.9: multipart form — ReportedQty/Comment as form
    // fields, photos as files. Not a status transition (WorkOrder.Status
    // doesn't change), so this isn't in the /assign../reject transition
    // family above.
    [HttpPost("{workOrderId:guid}/progress")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> AddProgress(
        Guid workOrderId,
        [FromForm] decimal reportedQty,
        [FromForm] string? comment,
        [FromForm] List<IFormFile>? photos,
        CancellationToken cancellationToken)
    {
        var photoDtos = (photos ?? [])
            .Select(f => new WorkOrderProgressPhoto(f.OpenReadStream(), f.ContentType, f.Length))
            .ToList();

        var command = new AddWorkOrderProgressCommand(workOrderId, reportedQty, comment, photoDtos);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // MASTER §1.1/§5.13/§9.4: PUT /work-orders/{id}/payout-shares —
    // Brigadir, own brigade. Replaces the entire share set in one call —
    // §5.13's "Σ SharePercent = 100.00 ровно" is checked against the whole
    // incoming set, never per-row.
    [HttpPut("{workOrderId:guid}/payout-shares")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> SetPayoutShares(Guid workOrderId, SetPayoutSharesRequest request, CancellationToken cancellationToken)
    {
        var shares = request.Shares.Select(s => new WorkOrderPayoutShareInput(s.WorkerId, s.SharePercent)).ToList();
        var result = await sender.Send(new SetWorkOrderPayoutSharesCommand(workOrderId, shares), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

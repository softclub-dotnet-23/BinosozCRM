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
// succeed. Flagged for MASTER.md reconciliation. /rework and /close are
// still not exposed — same class of gap, out of this step's scope.
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

    [HttpGet("{workOrderId:guid}/log")]
    [Authorize(Roles = "Owner,Prorab,Brigadir")]
    public async Task<IActionResult> GetLog(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetWorkOrderLogQuery(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

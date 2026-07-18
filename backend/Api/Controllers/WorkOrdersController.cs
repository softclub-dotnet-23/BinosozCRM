using Api.Common;
using Api.Contracts.WorkOrders;
using Application.WorkOrders;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4 explicitly names /submit, /accept, /reject — /assign, /start,
// /rework, /close aren't in that table. Built anyway (the state machine is
// unusable without a way to reach Assigned/InProgress at all, and Accepted
// -> Closed's manual path is explicitly allowed by §7.1) and gated by
// inference from §12's role matrix (WorkOrder: Owner/Prorab CRUA, Brigadir
// R(own)+submit only) — flagged in the step report as an interpretation,
// not a literal §9.4 match.
[ApiController]
[Route("api/v1/work-orders")]
[Authorize(Roles = "Owner,Prorab")]
public sealed class WorkOrdersController(ISender sender) : ControllerBase
{
    [HttpPost]
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
    [Authorize(Roles = "Owner,Prorab,Brigadir")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListWorkOrdersQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{workOrderId:guid}")]
    [Authorize(Roles = "Owner,Prorab,Brigadir")]
    public async Task<IActionResult> Get(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetWorkOrderQuery(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/assign")]
    public async Task<IActionResult> Assign(Guid workOrderId, AssignWorkOrderRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AssignWorkOrderCommand(workOrderId, request.AssignedDate), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/start")]
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
    public async Task<IActionResult> Accept(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AcceptWorkOrderCommand(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{workOrderId:guid}/reject")]
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
    public async Task<IActionResult> Close(Guid workOrderId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CloseWorkOrderCommand(workOrderId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

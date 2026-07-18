using Api.Common;
using Api.Contracts.WorkOrders;
using Application.WorkOrders;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /work-orders — Prorab+ half only this step (Phase 2
// Step 1). Transition endpoints (/submit, /accept, /reject, etc.) are
// deliberately not here yet — Rule 3 requires TaskLog in the same
// transaction as every transition, and TaskLog isn't wired until Step 3.
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
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListWorkOrdersQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

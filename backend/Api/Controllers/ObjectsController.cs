using Api.Common;
using Api.Contracts.Objects;
using Application.Objects;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /objects, GET,PUT /objects/{id}, GET,POST
// /objects/{id}/estimate-items — Prorab+, filtered by ProrabObjectAssignment
// (§1.2: no assignments = sees all, one row = strict allow-list).
// GET,POST /objects/{id}/prorabs — Owner only, overriding the controller
// default.
[ApiController]
[Route("api/v1/objects")]
[Authorize(Roles = "Owner,Prorab")]
public sealed class ObjectsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateConstructionObjectRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateConstructionObjectCommand(
            request.Name,
            request.CustomerId,
            request.Address,
            request.StartDate,
            request.PlannedEndDate,
            request.Budget);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListConstructionObjectsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{objectId:guid}")]
    public async Task<IActionResult> Get(Guid objectId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetConstructionObjectQuery(objectId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("{objectId:guid}")]
    public async Task<IActionResult> Update(Guid objectId, UpdateConstructionObjectRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateConstructionObjectCommand(
            objectId,
            request.Name,
            request.Address,
            request.Status,
            request.StartDate,
            request.PlannedEndDate,
            request.ActualEndDate,
            request.Budget);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{objectId:guid}/estimate-items")]
    public async Task<IActionResult> CreateEstimateItem(Guid objectId, CreateEstimateItemRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateEstimateItemCommand(
            objectId,
            request.WorkType,
            request.Unit,
            request.PlannedQty,
            request.PlannedUnitPrice,
            request.Stage);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{objectId:guid}/estimate-items")]
    public async Task<IActionResult> ListEstimateItems(Guid objectId, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListEstimateItemsQuery(objectId, clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{objectId:guid}/prorabs")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> AssignProrab(Guid objectId, AssignProrabRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AssignProrabCommand(objectId, request.ProrabUserId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{objectId:guid}/prorabs")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> ListProrabs(Guid objectId, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListObjectProrabsQuery(objectId, clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{objectId:guid}/cost-breakdown")]
    public async Task<IActionResult> GetCostBreakdown(Guid objectId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetObjectCostBreakdownQuery(objectId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

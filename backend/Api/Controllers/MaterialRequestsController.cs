using Api.Common;
using Api.Contracts.MaterialRequests;
using Application.MaterialRequests;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: create is Brigadir-only, everything else is Prorab+ (no
// Brigadir read-back — same asymmetric split as MaterialConsumptionReport).
// /ordered has no named §9.4 endpoint — see MarkMaterialRequestOrderedCommand's
// comment for why it's built anyway.
[ApiController]
[Route("api/v1/material-requests")]
[Authorize(Roles = "Owner,Prorab")]
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
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListMaterialRequestsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{materialRequestId:guid}")]
    public async Task<IActionResult> Get(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetMaterialRequestQuery(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{materialRequestId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveMaterialRequestCommand(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{materialRequestId:guid}/reject")]
    public async Task<IActionResult> Reject(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new RejectMaterialRequestCommand(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{materialRequestId:guid}/ordered")]
    public async Task<IActionResult> MarkOrdered(Guid materialRequestId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new MarkMaterialRequestOrderedCommand(materialRequestId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{materialRequestId:guid}/force-close")]
    public async Task<IActionResult> ForceClose(
        Guid materialRequestId, ForceCloseMaterialRequestRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ForceCloseMaterialRequestCommand(materialRequestId, request.Comment), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

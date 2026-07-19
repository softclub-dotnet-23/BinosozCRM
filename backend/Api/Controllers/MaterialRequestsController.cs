using Api.Common;
using Api.Contracts.Materials;
using Application.Materials;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§7.3: POST /material-requests — Brigadir(C), own brigade.
// GET — Prorab+(R). /approve, /reject — Prorab+. /force-close and the
// MaterialDelivery-driven auto-transitions aren't wired yet — Step 3's job
// (MaterialDelivery doesn't exist in Application yet either, and
// force-close's precondition, PartiallyDelivered, can't be reached without
// it).
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
}

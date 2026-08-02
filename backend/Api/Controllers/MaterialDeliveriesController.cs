using Api.Common;
using Api.Contracts.Materials;
using Application.Materials;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /material-deliveries — Prorab+.
[ApiController]
[Route("api/v1/material-deliveries")]
[Authorize(Roles = "Owner,Prorab")]
public sealed class MaterialDeliveriesController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateMaterialDeliveryRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateMaterialDeliveryCommand(
            request.ObjectId,
            request.MaterialRequestId,
            request.MaterialName,
            request.Unit,
            request.Qty,
            request.UnitCost,
            request.SupplierName);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // Bulk "receipt document" path — several material lines in one call,
    // one transaction, sharing a generated DocumentId. See
    // CreateMaterialDeliveryDocumentCommand for why there's no
    // MaterialRequestId linkage on this path.
    [HttpPost("document")]
    public async Task<IActionResult> CreateDocument(CreateMaterialDeliveryDocumentRequest request, CancellationToken cancellationToken)
    {
        var items = request.Items
            .Select(i => new MaterialDeliveryDocumentLineInput(i.MaterialName, i.Unit, i.Qty, i.UnitCost))
            .ToList();

        var command = new CreateMaterialDeliveryDocumentCommand(request.ObjectId, request.SupplierName, items);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListMaterialDeliveriesQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{materialDeliveryId:guid}")]
    public async Task<IActionResult> Get(Guid materialDeliveryId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetMaterialDeliveryQuery(materialDeliveryId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // Absolute route (not nested under this controller's material-deliveries
    // prefix) — a materials catalog is conceptually its own resource, even
    // though the aggregate it's read from is MaterialDelivery and there's no
    // separate MaterialsController for it.
    [HttpGet("/api/v1/materials/catalog")]
    public async Task<IActionResult> ListCatalog(CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListMaterialCatalogQuery(), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

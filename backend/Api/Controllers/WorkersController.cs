using Api.Common;
using Api.Contracts.Workers;
using Application.Workers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4 lists these as "Prorab+" — Owner and Prorab. Brigadir's read
// access to own-brigade workers (§12 role matrix) isn't wired here; no
// endpoint for it is enumerated in §9.4 yet.
[ApiController]
[Route("api/v1")]
[Authorize(Roles = "Owner,Prorab")]
public sealed class WorkersController(ISender sender) : ControllerBase
{
    [HttpPost("brigades/{brigadeId:guid}/workers")]
    public async Task<IActionResult> Create(Guid brigadeId, CreateWorkerRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateWorkerCommand(
            brigadeId,
            request.FullName,
            request.Phone,
            request.BirthDate,
            request.PayRateType,
            request.PayRate,
            request.HireDate,
            request.UserId,
            request.Specialty,
            request.ShiftStartTime,
            request.DocumentType,
            request.DocumentExpiryDate);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("brigades/{brigadeId:guid}/workers")]
    public async Task<IActionResult> List(Guid brigadeId, [FromQuery] int page, [FromQuery] int pageSize, [FromQuery] bool includeInactive, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListBrigadeWorkersQuery(brigadeId, clampedPage, clampedPageSize, includeInactive), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // Company-wide, unlike the brigade-scoped list above — the /employees frontend page has no
    // single brigade to scope to. Accountant is added here (not on the class default) since
    // WorkerDto.FromEntity already grants Accountant the same full-detail projection as Owner.
    [HttpGet("workers")]
    [Authorize(Roles = "Owner,Prorab,Accountant")]
    public async Task<IActionResult> ListAll(
        [FromQuery] int page, [FromQuery] int pageSize, [FromQuery] bool includeInactive, [FromQuery] Guid? brigadeId, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListWorkersQuery(clampedPage, clampedPageSize, includeInactive, brigadeId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // A Brigadir's own crew roster — the two endpoints above are both Owner/Prorab/Accountant
    // only, so this is the only way a Brigadir ever sees their own team through this controller.
    [HttpGet("brigades/mine/workers")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> ListMine([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListMyBrigadeWorkersQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("workers/{workerId:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid workerId, TerminateWorkerRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new TerminateWorkerCommand(workerId, request.TerminationDate), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

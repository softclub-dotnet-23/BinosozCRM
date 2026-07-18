using Api.Common;
using Api.Contracts.Workers;
using Application.Common.Models;
using Application.Workers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4 lists these as "Prorab+" — Owner and Prorab. Brigadir's read
// access to own-brigade workers (§12 role matrix) isn't wired here; no
// endpoint for it is enumerated in §9.4 yet. Accountant (the other role with
// stated Worker read access, §12: "R (с PayRate)") also has no route in here
// — §9.4 doesn't list one; presumably reads workers via Payroll endpoints
// once Phase 5 exists.
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
        if (result.IsFailure)
            return result.ToActionResult(HttpContext);

        return Ok(ToResponse(result.Value));
    }

    [HttpGet("brigades/{brigadeId:guid}/workers")]
    public async Task<IActionResult> List(Guid brigadeId, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListBrigadeWorkersQuery(brigadeId, clampedPage, clampedPageSize), cancellationToken);
        if (result.IsFailure)
            return result.ToActionResult(HttpContext);

        var page1 = result.Value;
        var items = page1.Items.Select(ToResponse).ToList();
        return Ok(new PagedResult<object>(items, page1.Page, page1.PageSize, page1.TotalCount));
    }

    [HttpPut("workers/{workerId:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid workerId, TerminateWorkerRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new TerminateWorkerCommand(workerId, request.TerminationDate), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // MASTER §11.6/§12, Phase 1 Step 6: different Response DTO per role, not
    // masking on the client. Only Owner/Prorab ever reach this endpoint (the
    // class-level [Authorize] above), so the only distinction that matters
    // here is Prorab losing PayRateType/PayRate.
    private object ToResponse(WorkerDto worker) =>
        User.IsInRole("Prorab")
            ? new WorkerProrabResponse(
                worker.Id, worker.BrigadeId, worker.UserId, worker.FullName, worker.Phone, worker.BirthDate,
                worker.Specialty, worker.ShiftStartTime, worker.DocumentType, worker.DocumentExpiryDate,
                worker.HireDate, worker.TerminationDate, worker.IsActive)
            : new WorkerResponse(
                worker.Id, worker.BrigadeId, worker.UserId, worker.FullName, worker.Phone, worker.BirthDate,
                worker.Specialty, worker.PayRateType, worker.PayRate, worker.ShiftStartTime, worker.DocumentType,
                worker.DocumentExpiryDate, worker.HireDate, worker.TerminationDate, worker.IsActive);
}

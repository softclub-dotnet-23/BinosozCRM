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

    [HttpPut("workers/{workerId:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid workerId, TerminateWorkerRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new TerminateWorkerCommand(workerId, request.TerminationDate), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // Worker-role checkpoint (docs/PROGRESS.md, post-MASTER addition): links
    // an existing Worker record to a new login-capable User — see
    // LinkWorkerUserCommand's own comment for the onboarding flow.
    [HttpPost("workers/{workerId:guid}/link-user")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> LinkUser(Guid workerId, LinkWorkerUserRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new LinkWorkerUserCommand(workerId, request.UserId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("workers/{workerId:guid}/pay-rate")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> ChangePayRate(Guid workerId, ChangeWorkerPayRateRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ChangeWorkerPayRateCommand(workerId, request.PayRateType, request.PayRate, request.EffectiveFrom), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // Post-MASTER addition (Worker-role checkpoint, docs/PROGRESS.md): a
    // Brigadir or Worker reading their own linked Worker record — full
    // details, no masking (see GetOwnWorkerProfileQuery's own comment).
    [HttpGet("workers/me")]
    [Authorize(Roles = "Brigadir,Worker")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetOwnWorkerProfileQuery(), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

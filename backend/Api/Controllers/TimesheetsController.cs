using Api.Common;
using Api.Contracts.Timesheets;
using Application.Timesheets;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§8.1/§8.4: GET,POST /timesheets — Prorab+ (read) / Brigadir
// (own brigade, read+write). POST /timesheets is the backdated-correction
// path (CreateTimesheetCommand, always EnteredManually); the live flow is
// /check-in + /{id}/check-out. Only Brigadir marks attendance ("Только
// бригадир отмечает") — Prorab+ reads and approves, never creates.
[ApiController]
[Route("api/v1/timesheets")]
[Authorize]
public sealed class TimesheetsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Owner,Prorab,Brigadir")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListTimesheetsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // MASTER §15 open question №9's implemented default: no Telegram for the
    // Brigadir -> Prorab enters the day's attendance directly via API,
    // EnteredManually = true. Prorab+, object-scoped (ProrabObjectAccess),
    // not brigade-scoped -- Prorab has no linked Worker row to resolve an
    // "own brigade" from the way Brigadir's check-in/check-out do.
    [HttpPost]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Create(CreateManualTimesheetRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateManualTimesheetCommand(request.WorkerId, request.ObjectId, request.Date, request.CheckInAt, request.CheckOutAt);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{timesheetId:guid}")]
    [Authorize(Roles = "Owner,Prorab,Brigadir")]
    public async Task<IActionResult> Get(Guid timesheetId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetTimesheetQuery(timesheetId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("check-in")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> CheckIn(CheckInRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CheckInCommand(request.WorkerId, request.ObjectId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{timesheetId:guid}/check-out")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> CheckOut(Guid timesheetId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CheckOutCommand(timesheetId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // MASTER §12's literal role matrix: Timesheet | R | RA | ... — Owner is
    // R only, no A. Corrected from the class-level Owner,Prorab default,
    // same reasoning as the identical WorkOrderPayoutShare.Approve gap
    // (merge Step 3, WorkOrders zone).
    [HttpPost("{timesheetId:guid}/approve")]
    [Authorize(Roles = "Prorab")]
    public async Task<IActionResult> Approve(Guid timesheetId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveTimesheetCommand(timesheetId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

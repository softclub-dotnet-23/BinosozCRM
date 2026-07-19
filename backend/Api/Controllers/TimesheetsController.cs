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

    [HttpPost]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Create(CreateTimesheetRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateTimesheetCommand(request.WorkerId, request.ObjectId, request.Date, request.CheckInAt, request.CheckOutAt);
        var result = await sender.Send(command, cancellationToken);
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

    [HttpPost("{timesheetId:guid}/approve")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Approve(Guid timesheetId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveTimesheetCommand(timesheetId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

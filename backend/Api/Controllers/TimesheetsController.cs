using Api.Common;
using Api.Contracts.Timesheets;
using Application.Timesheets;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /timesheets (Prorab+ / Brigadir-own read), POST
// /timesheets/check-in and /{id}/check-out (Brigadir), /{id}/approve
// (Prorab+). Every endpoint here is literally named in §9.4 — no
// inference needed this step.
[ApiController]
[Route("api/v1/timesheets")]
[Authorize(Roles = "Owner,Prorab")]
public sealed class TimesheetsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateManualTimesheetRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateManualTimesheetCommand(
            request.WorkerId, request.ObjectId, request.Date, request.CheckInAt, request.CheckOutAt);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Prorab,Brigadir")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListTimesheetsQuery(clampedPage, clampedPageSize), cancellationToken);
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
    public async Task<IActionResult> CheckIn(CheckInTimesheetRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CheckInTimesheetCommand(request.WorkerId, request.ObjectId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{timesheetId:guid}/check-out")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> CheckOut(Guid timesheetId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CheckOutTimesheetCommand(timesheetId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{timesheetId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid timesheetId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveTimesheetCommand(timesheetId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

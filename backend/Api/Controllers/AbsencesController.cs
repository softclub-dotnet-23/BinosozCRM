using Api.Common;
using Api.Contracts.Absences;
using Application.Absences;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4/§8.9: GET,POST /absences — Prorab+, Accountant. No Brigadir
// path at all ("нужен документ/решение") — the only controller in this
// codebase with zero Brigadir-reachable actions.
[ApiController]
[Route("api/v1/absences")]
[Authorize(Roles = "Owner,Prorab,Accountant")]
public sealed class AbsencesController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListAbsenceRecordsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAbsenceRecordRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateAbsenceRecordCommand(
            request.WorkerId,
            request.DateFrom,
            request.DateTo,
            request.Type,
            request.IsPaid,
            request.Reason,
            request.DocumentUrl);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

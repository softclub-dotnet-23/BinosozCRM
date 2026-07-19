using Api.Common;
using Api.Contracts.AbsenceRecords;
using Application.AbsenceRecords;
using Application.WorkOrders;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /absences — Prorab+, Accountant. Deliberately no
// Brigadir — §8.9: "не бригадир, нужен документ/решение". GET /{id} isn't
// literally listed but added for the same REST-completeness reason as
// elsewhere this project.
[ApiController]
[Route("api/v1/absences")]
[Authorize(Roles = "Owner,Prorab,Accountant")]
public sealed class AbsencesController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(CreateAbsenceRecordRequest request, CancellationToken cancellationToken)
    {
        PhotoUpload? document = request.Document is null
            ? null
            : new PhotoUpload(request.Document.OpenReadStream(), request.Document.ContentType, request.Document.Length);

        var command = new CreateAbsenceRecordCommand(
            request.WorkerId, request.DateFrom, request.DateTo, request.Type, request.IsPaid, request.Reason, document);

        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListAbsenceRecordsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{absenceRecordId:guid}")]
    public async Task<IActionResult> Get(Guid absenceRecordId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetAbsenceRecordQuery(absenceRecordId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

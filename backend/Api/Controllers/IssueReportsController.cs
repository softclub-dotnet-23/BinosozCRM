using Api.Common;
using Application.IssueReports;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// New (Worker-dashboard checkpoint, docs/PROGRESS.md): "Сообщить о
// проблеме" — Brigadir/Worker create, own object; Prorab+ reads (own
// ProrabObjectAssignment scope) and resolves. Not in MASTER §9.4's original
// endpoint table — MASTER.md itself doesn't know about this entity yet.
[ApiController]
[Route("api/v1/issue-reports")]
[Authorize]
public sealed class IssueReportsController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Brigadir,Worker")]
    public async Task<IActionResult> Create(
        [FromForm] Guid objectId,
        [FromForm] string title,
        [FromForm] string description,
        [FromForm] Guid? individualTaskId,
        [FromForm] IFormFile? photo,
        CancellationToken cancellationToken)
    {
        var photoDto = photo is null
            ? null
            : new IssueReportPhoto(photo.OpenReadStream(), photo.ContentType, photo.Length);

        var command = new CreateIssueReportCommand(objectId, title, description, individualTaskId, photoDto);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Prorab,Brigadir,Worker")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListIssueReportsQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{issueReportId:guid}/resolve")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> Resolve(Guid issueReportId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ResolveIssueReportCommand(issueReportId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

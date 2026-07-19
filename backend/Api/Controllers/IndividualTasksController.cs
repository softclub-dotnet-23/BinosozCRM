using Api.Common;
using Api.Contracts.IndividualTasks;
using Application.IndividualTasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /individual-tasks, POST .../start, POST
// .../complete — Brigadir only, own brigade (§11.5 rule 2, manual — see
// Application.IndividualTasks.BrigadeAccess). Bonus propose/approve
// (§8.7) is Phase 3 Step 6's scope, not built here.
[ApiController]
[Route("api/v1/individual-tasks")]
[Authorize(Roles = "Brigadir")]
public sealed class IndividualTasksController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateIndividualTaskRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateIndividualTaskCommand(request.AssignedToWorkerId, request.Title, request.Description, request.WorkOrderId, request.DueAt);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListIndividualTasksQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{taskId:guid}/start")]
    public async Task<IActionResult> Start(Guid taskId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new StartIndividualTaskCommand(taskId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{taskId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid taskId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CompleteIndividualTaskCommand(taskId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

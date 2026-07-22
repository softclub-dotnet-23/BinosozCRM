using Api.Common;
using Api.Contracts.IndividualTasks;
using Application.IndividualTasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /individual-tasks, POST .../start, POST
// .../complete — Brigadir only, own brigade (§11.5 rule 2, manual — see
// Application.IndividualTasks.BrigadeAccess). §8.7's bonus proposal rides
// on /complete itself (no separate "propose" endpoint in §9.4); approval
// (Phase 5 Step 5) is Prorab+ only — Brigadir can never confirm a bonus,
// including their own, purely by role authorization.
[ApiController]
[Route("api/v1/individual-tasks")]
[Authorize]
public sealed class IndividualTasksController(ISender sender) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Create(CreateIndividualTaskRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateIndividualTaskCommand(request.AssignedToWorkerId, request.Title, request.Description, request.WorkOrderId, request.DueAt);
        var result = await sender.Send(command, cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListIndividualTasksQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{taskId:guid}")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Get(Guid taskId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetIndividualTaskQuery(taskId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{taskId:guid}/start")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Start(Guid taskId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new StartIndividualTaskCommand(taskId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{taskId:guid}/complete")]
    [Authorize(Roles = "Brigadir")]
    public async Task<IActionResult> Complete(Guid taskId, CompleteIndividualTaskRequest? request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CompleteIndividualTaskCommand(taskId, request?.BonusAmount), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{taskId:guid}/bonus/approve")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> ApproveBonus(Guid taskId, ApproveBonusRequest? request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveBonusCommand(taskId, request?.OverrideAmount), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

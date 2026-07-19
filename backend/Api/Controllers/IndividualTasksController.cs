using Api.Common;
using Api.Contracts.IndividualTasks;
using Application.IndividualTasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §9.4: GET,POST /individual-tasks, /start, /complete — all Brigadir.
// §12's role matrix gives Owner/Prorab "R" too, but no endpoint is named for
// it — same recurring gap as elsewhere, flagged rather than invented.
// /bonus/approve (Owner,Prorab) landed later — Phase 5 Step 5 flagged it
// "нужно от Ахмада", built as a priority jump ahead of the next
// sequential Phase 6 step (see PROGRESS.md). Bonus *proposal*
// (Brigadir-facing, §8.7 point 2) is still Phase 3 Step 6's job — bot
// only, deferred — so this endpoint currently has no live path to ever
// receive a task with BonusAmount set, same situation as every other
// bot-deferred flow in this project.
[ApiController]
[Route("api/v1/individual-tasks")]
[Authorize(Roles = "Brigadir")]
public sealed class IndividualTasksController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateIndividualTaskRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateIndividualTaskCommand(
            request.AssignedToWorkerId,
            request.Title,
            request.Description,
            request.WorkOrderId,
            request.DueAt);

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

    [HttpGet("{taskId:guid}")]
    public async Task<IActionResult> Get(Guid taskId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetIndividualTaskQuery(taskId), cancellationToken);
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

    [HttpPost("{taskId:guid}/bonus/approve")]
    [Authorize(Roles = "Owner,Prorab")]
    public async Task<IActionResult> ApproveBonus(Guid taskId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveBonusCommand(taskId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

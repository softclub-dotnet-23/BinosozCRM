using Api.Common;
using Api.Contracts.Users;
using Application.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// GET /users/me — any authenticated role. Everything else (list/create/block/unblock) —
// Owner only, matching MASTER's "Единственный, кто управляет пользователями и ролями."
[ApiController]
[Route("api/v1/users")]
[Authorize]
public sealed class UsersController(ISender sender) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetCurrentUserQuery(), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListUsersQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CreateUserCommand(request.FullName, request.Phone, request.Role), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("{userId:guid}/block")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Block(Guid userId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new BlockUserCommand(userId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("{userId:guid}/unblock")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Unblock(Guid userId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UnblockUserCommand(userId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

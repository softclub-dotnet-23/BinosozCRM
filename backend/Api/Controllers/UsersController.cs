using Api.Common;
using Api.Contracts.Users;
using Application.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// MASTER §4/§12: "Единственный, кто управляет пользователями и ролями" —
// User row in the role matrix is Owner:CRU, every other role: nothing at
// all. Every action here is Owner-only, no per-action override.
[ApiController]
[Route("api/v1/users")]
[Authorize(Roles = "Owner")]
public sealed class UsersController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = Math.Max(page == 0 ? 1 : page, 1);
        var clampedPageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 100);

        var result = await sender.Send(new ListUsersQuery(clampedPage, clampedPageSize), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CreateUserCommand(request.FullName, request.Phone, request.Role), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("{userId:guid}/role")]
    public async Task<IActionResult> ChangeRole(Guid userId, ChangeUserRoleRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ChangeUserRoleCommand(userId, request.Role), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{userId:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid userId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new DeactivateUserCommand(userId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{userId:guid}/activate")]
    public async Task<IActionResult> Activate(Guid userId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ActivateUserCommand(userId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{userId:guid}/regenerate-temporary-password")]
    public async Task<IActionResult> RegenerateTemporaryPassword(Guid userId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new RegenerateTemporaryPasswordCommand(userId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{userId:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid userId, OwnerResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ResetUserPasswordCommand(userId, request.NewPassword), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

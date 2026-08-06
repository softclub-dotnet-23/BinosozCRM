using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// PUT /users/{id}/block — Owner only. Sets IsActive=false; AdminAuditSaveChangesInterceptor
// writes the UserDeactivated entry automatically on the tracked property change, and the
// existing LoginCommand already rejects IsActive=false with AUTH_ACCOUNT_DEACTIVATED.
public sealed record BlockUserCommand(Guid UserId) : IRequest<Result<UserDto>>;

public sealed class BlockUserCommandHandler(IApplicationDbContext context)
    : IRequestHandler<BlockUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(BlockUserCommand request, CancellationToken cancellationToken)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure<UserDto>(new Error("USER_NOT_FOUND", "User not found."));

        user.Deactivate();
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(UserDto.FromEntity(user));
    }
}

using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// PUT /users/{id}/unblock — Owner only. Sets IsActive=true. Not audited by
// AdminAuditSaveChangesInterceptor (it only fires on the true→false transition, matching
// MASTER §11.7's "деактивация" wording) — reactivation was never called out as an audited
// action, so this deliberately doesn't invent a new AdminAuditAction value for it.
public sealed record UnblockUserCommand(Guid UserId) : IRequest<Result<UserDto>>;

public sealed class UnblockUserCommandHandler(IApplicationDbContext context)
    : IRequestHandler<UnblockUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(UnblockUserCommand request, CancellationToken cancellationToken)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure<UserDto>(new Error("USER_NOT_FOUND", "User not found."));

        user.Activate();
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(UserDto.FromEntity(user));
    }
}

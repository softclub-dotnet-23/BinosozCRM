using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// GET /users/me — every authenticated role. The JWT (Api/Auth/JwtTokenService)
// carries UserId/CompanyId/Role but no display name (AuthTokensDto has none
// either, see frontend/src/lib/auth/authService.ts) — this is the one lookup
// the frontend needs right after login to know who it's talking to.
public sealed record GetCurrentUserQuery : IRequest<Result<UserDto>>;

public sealed class GetCurrentUserQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetCurrentUserQuery, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
            return Result.Failure<UserDto>(new Error("USER_NOT_FOUND", "User not found."));

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
            return Result.Failure<UserDto>(new Error("USER_NOT_FOUND", "User not found."));

        return Result.Success(UserDto.FromEntity(user));
    }
}

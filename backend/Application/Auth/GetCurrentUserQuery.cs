using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth;

// GET /auth/me — the "who am I" the login/refresh response itself never
// carried: AuthTokensDto only ever had the user id inside the JWT's own
// NameIdentifier claim, never phone/FullName (frontend-integration gap, no
// MASTER.md section covers a /me endpoint explicitly). User is now company
// scoped, so this lookup also fails closed if a token's tenant claim and the
// persisted user ownership ever disagree.
public sealed record GetCurrentUserQuery : IRequest<Result<CurrentUserDto>>;

public sealed record CurrentUserDto(Guid Id, string Phone, string FullName, string Role);

public sealed class GetCurrentUserQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetCurrentUserQuery, Result<CurrentUserDto>>
{
    public async Task<Result<CurrentUserDto>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        if (user is null)
            return Result.Failure<CurrentUserDto>(new Error("USER_NOT_FOUND", "User not found."));

        return Result.Success(new CurrentUserDto(user.Id, user.Phone, user.FullName, user.Role.ToString()));
    }
}

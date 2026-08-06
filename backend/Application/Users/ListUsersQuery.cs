using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// GET /users — Owner only (MASTER: "Единственный, кто управляет пользователями и ролями").
public sealed record ListUsersQuery(int Page, int PageSize) : IRequest<Result<PagedResult<UserDto>>>;

public sealed class ListUsersQueryHandler(IApplicationDbContext context)
    : IRequestHandler<ListUsersQuery, Result<PagedResult<UserDto>>>
{
    public async Task<Result<PagedResult<UserDto>>> Handle(ListUsersQuery request, CancellationToken cancellationToken)
    {
        var query = context.Users.OrderBy(u => u.FullName);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(UserDto.FromEntity).ToList();

        return Result.Success(new PagedResult<UserDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}

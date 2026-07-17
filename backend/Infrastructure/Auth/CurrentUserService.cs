using System.Security.Claims;
using Application.Common.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.Auth;

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public const string CompanyIdClaimType = "company_id";

    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public Guid? UserId =>
        Guid.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : null;

    public Guid? CompanyId =>
        Guid.TryParse(User?.FindFirstValue(CompanyIdClaimType), out var companyId) ? companyId : null;

    public Role? Role =>
        Enum.TryParse<Domain.Enums.Role>(User?.FindFirstValue(ClaimTypes.Role), out var role) ? role : null;
}

using System.Security.Claims;
using Application.Common.Interfaces;
using Domain.Enums;
using Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Api.Hubs;

// MASTER §9.4: "/hubs/work-orders ... Группы из claims, никогда из
// клиентского ввода." Group membership is decided entirely here, from the
// connection's own JWT claims, at connect time — there is no hub method a
// client could call to join an arbitrary group. Doesn't use
// ICurrentUserService (IHttpContextAccessor-based) — that's tuned for the
// regular HTTP request pipeline, not the SignalR connection lifecycle;
// claims are read directly off Context.User instead, the SignalR-native way.
[Authorize]
public sealed class WorkOrdersHub(IApplicationDbContext context) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var companyIdClaim = Context.User?.FindFirstValue(CurrentUserService.CompanyIdClaimType);
        if (Guid.TryParse(companyIdClaim, out var companyId))
            await Groups.AddToGroupAsync(Context.ConnectionId, WorkOrderHubGroups.Company(companyId));

        var roleClaim = Context.User?.FindFirstValue(ClaimTypes.Role);
        if (Enum.TryParse<Role>(roleClaim, out var role) && role == Role.Brigadir)
        {
            var userIdClaim = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdClaim, out var userId) && companyId != Guid.Empty)
            {
                // .IgnoreQueryFilters() + an explicit CompanyId match, not the
                // ambient global filter — that filter reads
                // ICurrentUserService (IHttpContextAccessor-based), which
                // isn't guaranteed populated during a Hub's connection
                // lifecycle the way it is for a normal HTTP request. Using
                // the claim already parsed above keeps this correct
                // regardless of that.
                var brigadeId = await context.Workers
                    .IgnoreQueryFilters()
                    .Where(w => w.CompanyId == companyId && w.UserId == userId)
                    .Select(w => (Guid?)w.BrigadeId)
                    .FirstOrDefaultAsync();

                if (brigadeId is not null)
                    await Groups.AddToGroupAsync(Context.ConnectionId, WorkOrderHubGroups.Brigade(brigadeId.Value));
            }
        }

        await base.OnConnectedAsync();
    }
}

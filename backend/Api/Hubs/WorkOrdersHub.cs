using Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs;

// MASTER §9.4: "группы из claims, никогда из клиентского ввода." CompanyId
// is the only isolation claim baked into the JWT (see CurrentUserService —
// UserId/CompanyId/Role, nothing brigade- or object-scoped), so
// "company:{id}" is the finest group this hub can join without inventing a
// new claim. No hub method here ever takes a caller-supplied group name.
[Authorize]
public sealed class WorkOrdersHub : Hub
{
    public const string CompanyGroupPrefix = "company:";

    public override async Task OnConnectedAsync()
    {
        var companyId = Context.User?.FindFirst(CurrentUserService.CompanyIdClaimType)?.Value;
        if (!string.IsNullOrEmpty(companyId))
            await Groups.AddToGroupAsync(Context.ConnectionId, CompanyGroupPrefix + companyId);

        await base.OnConnectedAsync();
    }
}

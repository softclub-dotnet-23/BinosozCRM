using System.Security.Claims;
using Api.Common;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Api.Middleware;

// MASTER §11.1: "Деактивация: User.IsActive = false проверяется middleware
// на каждом запросе по UserId из токена. Иначе уволенный работает ещё 15
// минут." Unlike ForcePasswordChangeMiddleware (deliberately claim-only —
// a stale claim there can only be too strict), IsActive can only be
// answered correctly by a DB read: the access token has no way to reflect
// a deactivation that happened after it was issued, and that's exactly the
// gap this closes.
public sealed class AccountActiveMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IApplicationDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true &&
            Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            var isActive = await db.Users
                .IgnoreQueryFilters()
                .Where(u => u.Id == userId)
                .Select(u => (bool?)u.IsActive)
                .FirstOrDefaultAsync(context.RequestAborted);

            if (isActive != true)
            {
                // MASTER §9.2: AUTH_ACCOUNT_DEACTIVATED is 400, same code
                // login already returns for this case (ErrorCodeCatalog.cs) —
                // kept consistent rather than inventing a 401 variant here.
                await ErrorEnvelope.WriteAsync(
                    context,
                    StatusCodes.Status400BadRequest,
                    "AUTH_ACCOUNT_DEACTIVATED",
                    "This account has been deactivated.");
                return;
            }
        }

        await next(context);
    }
}

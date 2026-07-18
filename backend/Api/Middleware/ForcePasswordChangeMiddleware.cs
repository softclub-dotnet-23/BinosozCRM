using System.Security.Claims;
using Api.Common;
using Infrastructure.Auth;

namespace Api.Middleware;

// MASTER §5.27: while User.ForcePasswordChange is set, every request except
// change-password (and logout, so a user can always get out) is rejected —
// blocked by JWT claim, not a DB read per request, so a stale claim in an
// already-issued access token can only ever be too strict, never too lax.
public sealed class ForcePasswordChangeMiddleware(RequestDelegate next)
{
    private static readonly string[] AllowedPaths =
    [
        "/api/v1/auth/change-password",
        "/api/v1/auth/logout"
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var forcePasswordChange = context.User.FindFirstValue(CurrentUserService.ForcePasswordChangeClaimType) == "true";
            var isAllowedPath = AllowedPaths.Any(path => context.Request.Path.StartsWithSegments(path, StringComparison.OrdinalIgnoreCase));

            if (forcePasswordChange && !isAllowedPath)
            {
                await ErrorEnvelope.WriteAsync(
                    context,
                    StatusCodes.Status403Forbidden,
                    "PASSWORD_CHANGE_REQUIRED",
                    "Password change is required before continuing.");
                return;
            }
        }

        await next(context);
    }
}

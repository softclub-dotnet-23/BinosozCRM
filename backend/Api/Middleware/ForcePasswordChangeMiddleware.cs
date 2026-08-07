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
        "/api/v1/auth/logout",
        // Frontend-integration: PUT /change-password succeeding doesn't itself change the
        // force_password_change claim already baked into the current access token (JWTs are
        // immutable) — the frontend's own documented flow (AuthContext.tsx) always follows a
        // successful change-password with POST /auth/refresh to get a token that reflects it.
        // Without this in the allowlist that refresh call 403s, and the user can never leave
        // this screen despite having just changed their password — the exact "always get out"
        // gap the class comment above already claims not to have.
        "/api/v1/auth/refresh"
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

using System.Security.Claims;
using Api.Common;
using Api.Contracts.Auth;
using Api.RateLimiting;
using Application.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Api.Controllers;

// MASTER §11.8: "алерт на... неудачные логины пачкой." Every individual
// failed attempt is logged here (structured, no password) so an external
// log-based alert rule can key off "N AUTH_INVALID_CREDENTIALS for the
// same phone within a window" — the burst-threshold breach itself is a
// separate, louder log line in Program.cs's rate-limiter OnRejected
// callback, since that's the point where this system already knows a
// burst just happened (RateLimitPolicies.AuthLogin's own 5-per-15-minutes
// threshold), not a second threshold invented here.
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(ISender sender, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthLogin)]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await sender.Send(new LoginCommand(request.Phone, request.Password, ipAddress), cancellationToken);

        if (result.IsFailure)
        {
            logger.LogWarning(
                "Failed login attempt for {Phone} from {IpAddress}: {ErrorCode}",
                request.Phone, ipAddress, result.Error.Code);
        }

        return result.ToActionResult(HttpContext);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await sender.Send(new RefreshTokenCommand(request.RefreshToken, ipAddress), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new LogoutCommand(request.RefreshToken), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await sender.Send(new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthForgotPassword)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ForgotPasswordCommand(request.Phone), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ResetPasswordCommand(request.Token, request.NewPassword), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

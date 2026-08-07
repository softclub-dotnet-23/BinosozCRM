using Api.Common;
using Api.Contracts.Auth.Qr;
using Api.RateLimiting;
using Application.Auth.Qr;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Hosting;

namespace Api.Controllers;

// QR login: a web client (anonymous) starts a session and polls its status;
// an already-authenticated mobile client scans/approves/rejects it; the web
// client exchanges an Approved session for a real AuthTokensDto through the
// same token issuance AuthController.Login/Refresh use. See
// Application/Auth/Qr/*.cs for the security reasoning behind each step.
[ApiController]
[Route("api/v1/auth/qr")]
public sealed class QrLoginController(ISender sender, IHostEnvironment environment) : ControllerBase
{
    [HttpPost("start")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthQrStart)]
    public async Task<IActionResult> Start(CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await sender.Send(new StartQrLoginSessionCommand(ipAddress), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpGet("{sessionId:guid}/status")]
    [AllowAnonymous]
    public async Task<IActionResult> Status(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetQrLoginSessionStatusQuery(sessionId), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{sessionId:guid}/scan")]
    [Authorize]
    public async Task<IActionResult> Scan(Guid sessionId, QrTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ScanQrLoginSessionCommand(sessionId, request.QrToken), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("approve")]
    [Authorize]
    public async Task<IActionResult> Approve(QrLoginSessionActionRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveQrLoginSessionCommand(request.SessionId, request.QrToken), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("reject")]
    [Authorize]
    public async Task<IActionResult> Reject(QrLoginSessionActionRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new RejectQrLoginSessionCommand(request.SessionId, request.QrToken), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    [HttpPost("{sessionId:guid}/exchange")]
    [AllowAnonymous]
    public async Task<IActionResult> Exchange(Guid sessionId, QrTokenRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await sender.Send(new ExchangeQrLoginSessionCommand(sessionId, request.QrToken, ipAddress), cancellationToken);
        return result.ToActionResult(HttpContext);
    }

    // Development-only emulation of "an authenticated mobile client approves
    // this session" — no mobile app exists yet. [DevelopmentOnly] (see
    // DevelopmentOnlyActionConvention, wired in Program.cs's AddControllers)
    // strips this action's route entirely outside Development, so the
    // endpoint has no entry in the routing table in production — not merely
    // an endpoint that exists and refuses. The IsDevelopment() check below is
    // deliberate defense-in-depth on top of that, not the only guard: if the
    // convention were ever misconfigured or bypassed, this still 404s before
    // touching MediatR/the database. Same idiom as Program.cs's Swagger gate
    // and Api/Auth/LoggingPasswordResetDeliveryService.
    [HttpPost("dev/approve")]
    [AllowAnonymous]
    [DevelopmentOnly]
    public async Task<IActionResult> DevApprove(DevApproveQrLoginRequest request, CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        var result = await sender.Send(
            new DevApproveQrLoginSessionCommand(request.SessionId, request.QrToken, request.Phone, request.Password), cancellationToken);
        return result.ToActionResult(HttpContext);
    }
}

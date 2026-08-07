using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Entities;
using MediatR;

namespace Application.Auth.Qr;

// POST /api/v1/auth/qr/start — anonymous (the web client isn't authenticated
// yet, that's the whole point). One row per session; no tenant is known until
// Approve() sets one, so this bypasses the CompanyId filter entirely rather
// than pretending to have one, same reasoning as LoginCommand.
public sealed record StartQrLoginSessionCommand(string IpAddress) : IRequest<Result<QrLoginStartDto>>;

public sealed class StartQrLoginSessionCommandHandler(IApplicationDbContext context) : IRequestHandler<StartQrLoginSessionCommand, Result<QrLoginStartDto>>
{
    // "несколько минут" — long enough for a human to open a camera and tap
    // confirm, short enough to keep a captured/observed QR image worthless
    // shortly after. Not per-company configurable: this is a technical
    // security parameter, not a business rule (AGENTS.md's "keep it
    // configurable" guidance is about open business questions, not this).
    public static readonly TimeSpan SessionTtl = TimeSpan.FromMinutes(3);

    public async Task<Result<QrLoginStartDto>> Handle(StartQrLoginSessionCommand request, CancellationToken cancellationToken)
    {
        var plainToken = RefreshTokenGenerator.GenerateToken();
        var expiresAt = DateTimeOffset.UtcNow.Add(SessionTtl);

        var session = QrLoginSession.Create(RefreshTokenGenerator.Hash(plainToken), expiresAt, request.IpAddress);
        context.QrLoginSessions.Add(session);
        await context.SaveChangesAsync(cancellationToken);

        var qrPayload = $"binosoz-qrlogin://auth?sessionId={session.Id}&token={Uri.EscapeDataString(plainToken)}";

        return Result.Success(new QrLoginStartDto(session.Id, plainToken, qrPayload, expiresAt));
    }
}

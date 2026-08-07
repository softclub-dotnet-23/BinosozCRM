using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Qr;

// POST /api/v1/auth/qr/{sessionId}/scan — [Authorize], any role. Called by the
// mobile client the instant it decodes the QR, before showing its own confirm
// screen. Requires the raw qrToken (proof the caller actually has the real QR
// content, not just a guessed sessionId) — that's what makes Pending->Scanned
// a real signal instead of anyone-who-knows-the-id noise.
public sealed record ScanQrLoginSessionCommand(Guid SessionId, string QrToken) : IRequest<Result>;

public sealed class ScanQrLoginSessionCommandValidator : AbstractValidator<ScanQrLoginSessionCommand>
{
    public ScanQrLoginSessionCommandValidator()
    {
        RuleFor(x => x.QrToken).NotEmpty();
    }
}

public sealed class ScanQrLoginSessionCommandHandler(IApplicationDbContext context) : IRequestHandler<ScanQrLoginSessionCommand, Result>
{
    public async Task<Result> Handle(ScanQrLoginSessionCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenGenerator.Hash(request.QrToken);
        var session = await context.QrLoginSessions
            .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.TokenHash == tokenHash, cancellationToken);

        if (session is null || session.ExpiresAt < DateTimeOffset.UtcNow)
            return Result.Failure(InvalidSession());

        if (session.Status is not (QrLoginSessionStatus.Pending or QrLoginSessionStatus.Scanned))
            return Result.Failure(InvalidSession());

        session.MarkScanned();
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static Error InvalidSession() =>
        new("AUTH_QR_SESSION_INVALID", "This QR login session is invalid, expired, or already resolved.");
}

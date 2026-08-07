using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Qr;

// POST /api/v1/auth/qr/reject — [Authorize], any role. Same qrToken-possession
// requirement as approve/scan, so a caller can't reject a session it never
// actually scanned just by guessing a sessionId.
public sealed record RejectQrLoginSessionCommand(Guid SessionId, string QrToken) : IRequest<Result>;

public sealed class RejectQrLoginSessionCommandValidator : AbstractValidator<RejectQrLoginSessionCommand>
{
    public RejectQrLoginSessionCommandValidator()
    {
        RuleFor(x => x.QrToken).NotEmpty();
    }
}

public sealed class RejectQrLoginSessionCommandHandler(IApplicationDbContext context) : IRequestHandler<RejectQrLoginSessionCommand, Result>
{
    public async Task<Result> Handle(RejectQrLoginSessionCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenGenerator.Hash(request.QrToken);
        var session = await context.QrLoginSessions
            .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.TokenHash == tokenHash, cancellationToken);

        if (session is null || session.ExpiresAt < DateTimeOffset.UtcNow)
            return Result.Failure(QrLoginApproval.InvalidSession());

        if (session.Status is not (QrLoginSessionStatus.Pending or QrLoginSessionStatus.Scanned))
            return Result.Failure(QrLoginApproval.InvalidSession());

        session.Reject();

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Same race as Approve/Exchange — xmin (QrLoginSessionConfiguration).
            return Result.Failure(QrLoginApproval.InvalidSession());
        }

        return Result.Success();
    }
}

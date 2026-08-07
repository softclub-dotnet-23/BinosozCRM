using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Qr;

// Shared by ApproveQrLoginSessionCommandHandler (real mobile client, identity
// from ICurrentUserService) and DevApproveQrLoginSessionCommandHandler
// (Development-only, identity from phone+password) — same reasoning as
// Workers/WorkerAccess.cs and IndividualTasks/BrigadeAccess.cs: one place for
// the actual state transition instead of two handlers reimplementing it, so
// the dev-only path is provably running the exact same approval logic, not a
// parallel fake one.
internal static class QrLoginApproval
{
    public static async Task<Result> ApproveAsync(
        IApplicationDbContext context, Guid sessionId, string qrToken, Guid userId, Guid companyId, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenGenerator.Hash(qrToken);
        var session = await context.QrLoginSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.TokenHash == tokenHash, cancellationToken);

        if (session is null || session.ExpiresAt < DateTimeOffset.UtcNow)
            return Result.Failure(InvalidSession());

        if (session.Status is not (QrLoginSessionStatus.Pending or QrLoginSessionStatus.Scanned))
            return Result.Failure(InvalidSession());

        session.Approve(userId, companyId, DateTimeOffset.UtcNow);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Two concurrent approvals both read Pending/Scanned before either
            // committed — xmin (QrLoginSessionConfiguration) makes the loser's
            // UPDATE affect zero rows instead of silently succeeding. Same
            // non-informative error as every other rejection here: the caller
            // already lost the race, retrying this same call is never correct
            // (the winner already owns the approval), only a fresh /start is.
            return Result.Failure(InvalidSession());
        }

        return Result.Success();
    }

    public static Error InvalidSession() =>
        new("AUTH_QR_SESSION_INVALID", "This QR login session is invalid, expired, or already resolved.");
}

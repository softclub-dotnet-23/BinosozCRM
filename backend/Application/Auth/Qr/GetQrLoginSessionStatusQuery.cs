using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Qr;

// GET /api/v1/auth/qr/{sessionId}/status — anonymous, sessionId only (public,
// used for web polling). Deliberately does NOT take the qrToken secret — a
// bare sessionId must be enough to ask "is my QR done yet", but never enough
// to get tokens (see ExchangeQrLoginSessionCommand, which does require it).
public sealed record GetQrLoginSessionStatusQuery(Guid SessionId) : IRequest<Result<QrLoginStatusDto>>;

public sealed class GetQrLoginSessionStatusQueryHandler(IApplicationDbContext context) : IRequestHandler<GetQrLoginSessionStatusQuery, Result<QrLoginStatusDto>>
{
    public async Task<Result<QrLoginStatusDto>> Handle(GetQrLoginSessionStatusQuery request, CancellationToken cancellationToken)
    {
        var session = await context.QrLoginSessions.FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);
        if (session is null)
            return Result.Failure<QrLoginStatusDto>(new Error("AUTH_QR_SESSION_NOT_FOUND", "QR login session not found."));

        var isPastExpiry = session.ExpiresAt < DateTimeOffset.UtcNow;
        var stillWaiting = session.Status is QrLoginSessionStatus.Pending or QrLoginSessionStatus.Scanned;

        var effectiveStatus = isPastExpiry && stillWaiting ? "Expired" : session.Status.ToString();

        return Result.Success(new QrLoginStatusDto(effectiveStatus));
    }
}

using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Qr;

// Development-only stand-in for "an already-authenticated mobile client
// scans and approves" — no mobile app exists yet (see docs/PROGRESS.md).
// Same idiom as Api.Auth.LoggingPasswordResetDeliveryService: not a fake, a
// real substitute for the one missing external actor. Identity is resolved
// by verifying phone+password here (same check LoginCommandHandler makes),
// then the exact same QrLoginApproval.ApproveAsync the real, [Authorize]'d
// endpoint uses does the actual state transition — so this can never diverge
// from what a real mobile approval does. The Development-only gate itself
// lives in the controller (a 404 outside Development, so this command isn't
// even reachable in production, not just "checked and allowed through").
public sealed record DevApproveQrLoginSessionCommand(Guid SessionId, string QrToken, string Phone, string Password) : IRequest<Result>;

public sealed class DevApproveQrLoginSessionCommandValidator : AbstractValidator<DevApproveQrLoginSessionCommand>
{
    public DevApproveQrLoginSessionCommandValidator()
    {
        RuleFor(x => x.QrToken).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class DevApproveQrLoginSessionCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    : IRequestHandler<DevApproveQrLoginSessionCommand, Result>
{
    public async Task<Result> Handle(DevApproveQrLoginSessionCommand request, CancellationToken cancellationToken)
    {
        var user = await context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => !u.IsDeleted && u.Phone == request.Phone, cancellationToken);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            return Result.Failure(new Error("AUTH_INVALID_CREDENTIALS", "Invalid phone or password."));

        if (!user.IsActive)
            return Result.Failure(new Error("AUTH_ACCOUNT_DEACTIVATED", "This account has been deactivated."));

        return await QrLoginApproval.ApproveAsync(context, request.SessionId, request.QrToken, user.Id, user.CompanyId, cancellationToken);
    }
}

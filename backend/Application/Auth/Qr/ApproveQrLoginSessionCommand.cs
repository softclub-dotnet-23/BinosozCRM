using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.Auth.Qr;

// POST /api/v1/auth/qr/approve — [Authorize], any role. The approving
// identity is read from ICurrentUserService (i.e. the caller's own validated
// JWT claims) inside the handler, never taken from the request body — the
// one rule that keeps this from being a cross-tenant/cross-account
// impersonation hole (MASTER §11.5's "IDOR закрыт явно" applies here too:
// nothing here lets a caller approve a session AS someone else). Same
// handler-reads-ICurrentUserService convention as
// Workers/ListWorkersQuery.cs and friends, rather than trusting a
// controller-assembled value.
public sealed record ApproveQrLoginSessionCommand(Guid SessionId, string QrToken) : IRequest<Result>;

public sealed class ApproveQrLoginSessionCommandValidator : AbstractValidator<ApproveQrLoginSessionCommand>
{
    public ApproveQrLoginSessionCommandValidator()
    {
        RuleFor(x => x.QrToken).NotEmpty();
    }
}

public sealed class ApproveQrLoginSessionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveQrLoginSessionCommand, Result>
{
    public Task<Result> Handle(ApproveQrLoginSessionCommand request, CancellationToken cancellationToken) =>
        QrLoginApproval.ApproveAsync(context, request.SessionId, request.QrToken, currentUser.UserId!.Value, currentUser.CompanyId!.Value, cancellationToken);
}

using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

// Brigade.Activate()/Deactivate() (Domain) sat unused — MASTER §12's "Brigade:
// Owner CRU, Prorab CRU" implies a brigade can be updated to inactive and
// back, same as Create/AssignBrigadir already exposed. No AdminAuditLog here,
// matching AssignBrigadirCommand's own precedent in this file (frontend-
// integration audit found MASTER §5.16's BrigadirAssigned action isn't
// written anywhere either — a pre-existing gap, flagged rather than
// silently expanded on here).
public sealed record ActivateBrigadeCommand(Guid BrigadeId) : IRequest<Result<BrigadeDto>>;

public sealed class ActivateBrigadeCommandValidator : AbstractValidator<ActivateBrigadeCommand>
{
    public ActivateBrigadeCommandValidator()
    {
        RuleFor(x => x.BrigadeId).NotEmpty();
    }
}

public sealed class ActivateBrigadeCommandHandler(IApplicationDbContext context)
    : IRequestHandler<ActivateBrigadeCommand, Result<BrigadeDto>>
{
    public async Task<Result<BrigadeDto>> Handle(ActivateBrigadeCommand request, CancellationToken cancellationToken)
    {
        var brigade = await context.Brigades.FirstOrDefaultAsync(b => b.Id == request.BrigadeId, cancellationToken);
        if (brigade is null)
            return Result.Failure<BrigadeDto>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        brigade.Activate();
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(BrigadeDto.FromEntity(brigade));
    }
}

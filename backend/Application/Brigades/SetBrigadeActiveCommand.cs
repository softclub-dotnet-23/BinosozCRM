using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

// PUT /brigades/{id}/active — Owner,Prorab, same as create/list. Brigade.Activate/Deactivate
// already existed on the domain entity (state a brigade can legitimately be in — MASTER's
// "приостановлена/активна" life cycle) but had no command/endpoint wired to them; this is that
// missing thin layer, not a new domain concept.
public sealed record SetBrigadeActiveCommand(Guid BrigadeId, bool IsActive) : IRequest<Result<BrigadeDto>>;

public sealed class SetBrigadeActiveCommandValidator : AbstractValidator<SetBrigadeActiveCommand>
{
    public SetBrigadeActiveCommandValidator()
    {
        RuleFor(x => x.BrigadeId).NotEmpty();
    }
}

public sealed class SetBrigadeActiveCommandHandler(IApplicationDbContext context)
    : IRequestHandler<SetBrigadeActiveCommand, Result<BrigadeDto>>
{
    public async Task<Result<BrigadeDto>> Handle(SetBrigadeActiveCommand request, CancellationToken cancellationToken)
    {
        var brigade = await context.Brigades.FirstOrDefaultAsync(b => b.Id == request.BrigadeId, cancellationToken);
        if (brigade is null)
            return Result.Failure<BrigadeDto>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        if (request.IsActive)
            brigade.Activate();
        else
            brigade.Deactivate();

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(BrigadeDto.FromEntity(brigade));
    }
}

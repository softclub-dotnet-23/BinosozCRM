using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

public sealed record DeactivateBrigadeCommand(Guid BrigadeId) : IRequest<Result<BrigadeDto>>;

public sealed class DeactivateBrigadeCommandValidator : AbstractValidator<DeactivateBrigadeCommand>
{
    public DeactivateBrigadeCommandValidator()
    {
        RuleFor(x => x.BrigadeId).NotEmpty();
    }
}

public sealed class DeactivateBrigadeCommandHandler(IApplicationDbContext context)
    : IRequestHandler<DeactivateBrigadeCommand, Result<BrigadeDto>>
{
    public async Task<Result<BrigadeDto>> Handle(DeactivateBrigadeCommand request, CancellationToken cancellationToken)
    {
        var brigade = await context.Brigades.FirstOrDefaultAsync(b => b.Id == request.BrigadeId, cancellationToken);
        if (brigade is null)
            return Result.Failure<BrigadeDto>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        brigade.Deactivate();
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(BrigadeDto.FromEntity(brigade));
    }
}

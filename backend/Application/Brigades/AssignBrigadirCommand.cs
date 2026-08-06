using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

public sealed record AssignBrigadirCommand(Guid BrigadeId, Guid? UserId) : IRequest<Result<BrigadeDto>>;

public sealed class AssignBrigadirCommandValidator : AbstractValidator<AssignBrigadirCommand>
{
    public AssignBrigadirCommandValidator()
    {
        RuleFor(x => x.BrigadeId).NotEmpty();
    }
}

public sealed class AssignBrigadirCommandHandler(IApplicationDbContext context)
    : IRequestHandler<AssignBrigadirCommand, Result<BrigadeDto>>
{
    public async Task<Result<BrigadeDto>> Handle(AssignBrigadirCommand request, CancellationToken cancellationToken)
    {
        var brigade = await context.Brigades.FirstOrDefaultAsync(b => b.Id == request.BrigadeId, cancellationToken);
        if (brigade is null)
            return Result.Failure<BrigadeDto>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        if (request.UserId is not null && !await context.Users.AnyAsync(u => u.Id == request.UserId, cancellationToken))
            return Result.Failure<BrigadeDto>(new Error("USER_NOT_FOUND", "User not found."));

        brigade.AssignBrigadir(request.UserId);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(BrigadeDto.FromEntity(brigade));
    }
}

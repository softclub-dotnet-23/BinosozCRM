using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;

namespace Application.Brigades;

public sealed record CreateBrigadeCommand(string Name) : IRequest<Result<BrigadeDto>>;

public sealed class CreateBrigadeCommandValidator : AbstractValidator<CreateBrigadeCommand>
{
    public CreateBrigadeCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public sealed class CreateBrigadeCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateBrigadeCommand, Result<BrigadeDto>>
{
    public async Task<Result<BrigadeDto>> Handle(CreateBrigadeCommand request, CancellationToken cancellationToken)
    {
        var brigade = Brigade.Create(currentUser.CompanyId!.Value, request.Name);

        context.Brigades.Add(brigade);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(BrigadeDto.FromEntity(brigade));
    }
}

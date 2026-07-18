using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

public sealed record TerminateWorkerCommand(Guid WorkerId, DateOnly TerminationDate) : IRequest<Result>;

public sealed class TerminateWorkerCommandValidator : AbstractValidator<TerminateWorkerCommand>
{
    public TerminateWorkerCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.TerminationDate).NotEmpty();
    }
}

public sealed class TerminateWorkerCommandHandler(IApplicationDbContext context)
    : IRequestHandler<TerminateWorkerCommand, Result>
{
    public async Task<Result> Handle(TerminateWorkerCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure(new Error("WORKER_NOT_FOUND", "Worker not found."));

        worker.Terminate(request.TerminationDate);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

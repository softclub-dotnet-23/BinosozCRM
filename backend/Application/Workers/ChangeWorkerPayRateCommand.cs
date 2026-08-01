using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

public sealed record ChangeWorkerPayRateCommand(Guid WorkerId, PayRateType PayRateType, decimal PayRate, DateOnly EffectiveFrom) : IRequest<Result<WorkerDto>>;

public sealed class ChangeWorkerPayRateCommandValidator : AbstractValidator<ChangeWorkerPayRateCommand>
{
    public ChangeWorkerPayRateCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.PayRateType).IsInEnum();
        RuleFor(x => x.PayRate).GreaterThanOrEqualTo(0);
        When(x => x.PayRateType == PayRateType.Hourly, () => RuleFor(x => x.PayRate).GreaterThan(0));
        RuleFor(x => x.EffectiveFrom).NotEmpty();
    }
}

public sealed class ChangeWorkerPayRateCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ChangeWorkerPayRateCommand, Result<WorkerDto>>
{
    public async Task<Result<WorkerDto>> Handle(ChangeWorkerPayRateCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure<WorkerDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        var latestEffectiveFrom = await context.WorkerPayRateHistories
            .Where(r => r.WorkerId == worker.Id).MaxAsync(r => (DateOnly?)r.EffectiveFrom, cancellationToken);
        if (latestEffectiveFrom is not null && request.EffectiveFrom <= latestEffectiveFrom)
            return Result.Failure<WorkerDto>(new Error("PAY_RATE_EFFECTIVE_DATE_CONFLICT", "Effective date must be later than the current rate."));

        worker.ChangePayRate(request.PayRateType, request.PayRate);
        context.WorkerPayRateHistories.Add(WorkerPayRateHistory.Create(
            worker.CompanyId, worker.Id, request.PayRateType, request.PayRate, request.EffectiveFrom));
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Result.Failure<WorkerDto>(new Error("PAY_RATE_EFFECTIVE_DATE_CONFLICT", "A rate already exists for this effective date."));
        }

        return Result.Success(WorkerDto.FromEntity(worker, currentUser.Role));
    }
}

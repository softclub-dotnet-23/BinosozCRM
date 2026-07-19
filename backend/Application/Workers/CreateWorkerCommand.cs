using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

public sealed record CreateWorkerCommand(
    Guid BrigadeId,
    string FullName,
    string Phone,
    DateOnly BirthDate,
    PayRateType PayRateType,
    decimal PayRate,
    DateOnly HireDate,
    Guid? UserId,
    string? Specialty,
    TimeOnly? ShiftStartTime,
    string? DocumentType,
    DateOnly? DocumentExpiryDate) : IRequest<Result<WorkerDto>>;

public sealed class CreateWorkerCommandValidator : AbstractValidator<CreateWorkerCommand>
{
    public CreateWorkerCommandValidator()
    {
        RuleFor(x => x.BrigadeId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(20);
        RuleFor(x => x.BirthDate).NotEmpty().LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.UtcNow));
        RuleFor(x => x.PayRateType).IsInEnum();
        RuleFor(x => x.PayRate).GreaterThanOrEqualTo(0);
        RuleFor(x => x.HireDate).NotEmpty();
        RuleFor(x => x.Specialty).MaximumLength(200);
        RuleFor(x => x.DocumentType).MaximumLength(100);
    }
}

public sealed class CreateWorkerCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateWorkerCommand, Result<WorkerDto>>
{
    public async Task<Result<WorkerDto>> Handle(CreateWorkerCommand request, CancellationToken cancellationToken)
    {
        var brigadeExists = await context.Brigades.AnyAsync(b => b.Id == request.BrigadeId, cancellationToken);
        if (!brigadeExists)
            return Result.Failure<WorkerDto>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        if (request.UserId is not null && !await context.Users.AnyAsync(u => u.Id == request.UserId, cancellationToken))
            return Result.Failure<WorkerDto>(new Error("USER_NOT_FOUND", "Linked user not found."));

        Worker worker;
        try
        {
            worker = Worker.Create(
                currentUser.CompanyId!.Value,
                request.BrigadeId,
                request.FullName,
                request.Phone,
                request.BirthDate,
                request.PayRateType,
                request.PayRate,
                request.HireDate,
                request.UserId,
                request.Specialty,
                request.ShiftStartTime,
                request.DocumentType,
                request.DocumentExpiryDate);
        }
        catch (ArgumentException ex) when (ex.ParamName == "birthDate")
        {
            // Worker.Create throws for the 18+ guard instead of returning Result,
            // unlike every other guarded factory in Domain (WorkOrder,
            // IndividualTask, MaterialRequest). Domain is Ahmad's file — flagged,
            // not fixed here. Mapped so the API still returns the hard 400
            // WORKER_UNDERAGE MASTER §8.3 requires instead of a generic 500.
            return Result.Failure<WorkerDto>(new Error("WORKER_UNDERAGE", "Worker must be at least 18 years old on HireDate."));
        }

        context.Workers.Add(worker);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(WorkerDto.FromEntity(worker, currentUser.Role));
    }
}

using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// New endpoint, not in the original MASTER §9.4 table (added with the
// Worker-role checkpoint — see docs/PROGRESS.md): a Brigadir or Worker
// reading their own Worker record always sees full details (own
// PayRate/Document*). WorkerDto.FromEntity's masking exists for a caller
// viewing *someone else's* record — it doesn't apply to your own, so this
// builds the DTO directly rather than going through that masking.
public sealed record GetOwnWorkerProfileQuery : IRequest<Result<WorkerDto>>;

public sealed class GetOwnWorkerProfileQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetOwnWorkerProfileQuery, Result<WorkerDto>>
{
    public async Task<Result<WorkerDto>> Handle(GetOwnWorkerProfileQuery request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.AsNoTracking()
            .FirstOrDefaultAsync(w => w.UserId == currentUser.UserId, cancellationToken);

        if (worker is null)
            return Result.Failure<WorkerDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        return Result.Success(new WorkerDto(
            worker.Id,
            worker.BrigadeId,
            worker.UserId,
            worker.FullName,
            worker.Phone,
            worker.BirthDate,
            worker.Specialty,
            worker.PayRateType,
            worker.PayRate,
            worker.ShiftStartTime,
            worker.DocumentType,
            worker.DocumentExpiryDate,
            worker.HireDate,
            worker.TerminationDate,
            worker.IsActive));
    }
}

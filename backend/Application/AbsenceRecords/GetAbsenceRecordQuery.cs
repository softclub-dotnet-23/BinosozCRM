using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.AbsenceRecords;

public sealed record GetAbsenceRecordQuery(Guid Id) : IRequest<Result<AbsenceRecordDto>>;

public sealed class GetAbsenceRecordQueryHandler(IApplicationDbContext context, IPhotoStorageService photoStorage)
    : IRequestHandler<GetAbsenceRecordQuery, Result<AbsenceRecordDto>>
{
    public async Task<Result<AbsenceRecordDto>> Handle(GetAbsenceRecordQuery request, CancellationToken cancellationToken)
    {
        var record = await context.AbsenceRecords.FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);
        if (record is null)
            return Result.Failure<AbsenceRecordDto>(new Error("ABSENCE_RECORD_NOT_FOUND", "Absence record not found."));

        return Result.Success(AbsenceRecordDto.FromEntity(record, photoStorage));
    }
}

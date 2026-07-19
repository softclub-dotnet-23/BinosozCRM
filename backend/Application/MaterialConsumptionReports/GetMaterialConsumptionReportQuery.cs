using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialConsumptionReports;

public sealed record GetMaterialConsumptionReportQuery(Guid Id) : IRequest<Result<MaterialConsumptionReportDto>>;

public sealed class GetMaterialConsumptionReportQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetMaterialConsumptionReportQuery, Result<MaterialConsumptionReportDto>>
{
    public async Task<Result<MaterialConsumptionReportDto>> Handle(GetMaterialConsumptionReportQuery request, CancellationToken cancellationToken)
    {
        var report = await context.MaterialConsumptionReports.FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);
        if (report is null)
            return Result.Failure<MaterialConsumptionReportDto>(new Error("MATERIAL_CONSUMPTION_REPORT_NOT_FOUND", "Material consumption report not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(report.ObjectId))
            return Result.Failure<MaterialConsumptionReportDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(MaterialConsumptionReportDto.FromEntity(report));
    }
}

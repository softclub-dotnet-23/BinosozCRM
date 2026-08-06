using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Companies;

// MASTER §9.4: GET /companies/current — auth (any authenticated role).
// Company isn't ICompanyOwned (§5's own convention list excludes it
// explicitly, along with User/TelegramUpdateLog), so no global query
// filter narrows this — filtered here by the caller's own CompanyId claim
// instead, same as every other place Company is read.
public sealed record GetCurrentCompanyQuery : IRequest<Result<CompanyDto>>;

public sealed class GetCurrentCompanyQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetCurrentCompanyQuery, Result<CompanyDto>>
{
    public async Task<Result<CompanyDto>> Handle(GetCurrentCompanyQuery request, CancellationToken cancellationToken)
    {
        var company = await context.Companies.FirstOrDefaultAsync(c => c.Id == currentUser.CompanyId, cancellationToken);
        if (company is null)
            return Result.Failure<CompanyDto>(new Error("COMPANY_NOT_FOUND", "Company not found."));

        return Result.Success(CompanyDto.FromEntity(company));
    }
}

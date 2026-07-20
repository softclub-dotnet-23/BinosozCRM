using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Companies;

// MASTER §9.4: PUT /companies/current — Owner only. §5.1's own thresholds/
// modes: "Меняются без деплоя" is the entire point of this entity existing
// — this is the one endpoint that actually exercises that.
public sealed record UpdateCompanySettingsCommand(
    PieceworkDistributionMode PieceworkDistributionMode,
    int LatenessGraceMinutes,
    int LatenessNotifyThresholdMinutes,
    PayrollPeriodType PayrollPeriodType,
    string DefaultCurrency) : IRequest<Result<CompanyDto>>;

public sealed class UpdateCompanySettingsCommandValidator : AbstractValidator<UpdateCompanySettingsCommand>
{
    public UpdateCompanySettingsCommandValidator()
    {
        RuleFor(x => x.PieceworkDistributionMode).IsInEnum();
        RuleFor(x => x.LatenessGraceMinutes).GreaterThanOrEqualTo(0);
        RuleFor(x => x.LatenessNotifyThresholdMinutes).GreaterThanOrEqualTo(0);
        RuleFor(x => x.PayrollPeriodType).IsInEnum();
        RuleFor(x => x.DefaultCurrency).NotEmpty().Length(3);
    }
}

public sealed class UpdateCompanySettingsCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<UpdateCompanySettingsCommand, Result<CompanyDto>>
{
    public async Task<Result<CompanyDto>> Handle(UpdateCompanySettingsCommand request, CancellationToken cancellationToken)
    {
        var company = await context.Companies.FirstOrDefaultAsync(c => c.Id == currentUser.CompanyId, cancellationToken);
        if (company is null)
            return Result.Failure<CompanyDto>(new Error("COMPANY_NOT_FOUND", "Company not found."));

        company.UpdateSettings(
            request.PieceworkDistributionMode,
            request.LatenessGraceMinutes,
            request.LatenessNotifyThresholdMinutes,
            request.PayrollPeriodType,
            request.DefaultCurrency);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result.Failure<CompanyDto>(new Error("CONCURRENCY_CONFLICT", "Concurrent update — retry."));
        }

        return Result.Success(CompanyDto.FromEntity(company));
    }
}

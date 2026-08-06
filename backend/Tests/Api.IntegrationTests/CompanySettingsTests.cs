using Application.Companies;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §9.4/§5.1: GET,PUT /companies/current — the punch-list gap closed
// after Phase 6 Step 9 flagged it as documented but never built. §5.1's own
// point: thresholds/mode "меняются без деплоя" — this is the one endpoint
// that actually exercises that. Permanent coverage, real Postgres via
// PostgresFixture.
[Collection(PostgresCollection.Name)]
public sealed class CompanySettingsTests(PostgresFixture fixture)
{
    private async Task<FixedCurrentUserService> SeedCompanyAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        context.Companies.Add(Company.Create(companyId, $"Settings Test Co {companyId}"));
        await context.SaveChangesAsync(CancellationToken.None);

        return owner;
    }

    [Fact]
    public async Task Get_current_returns_the_callers_own_company_with_default_settings()
    {
        var owner = await SeedCompanyAsync();

        await using var context = fixture.CreateDbContext(owner);
        var result = await new GetCurrentCompanyQueryHandler(context, owner).Handle(new GetCurrentCompanyQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(owner.CompanyId!.Value);
        result.Value.PieceworkDistributionMode.Should().Be(PieceworkDistributionMode.Manual);
        result.Value.LatenessGraceMinutes.Should().Be(0);
        result.Value.PayrollPeriodType.Should().Be(PayrollPeriodType.Monthly);
        result.Value.DefaultCurrency.Should().Be("TJS");
    }

    [Fact]
    public async Task Update_persists_new_settings_and_a_subsequent_get_reflects_them()
    {
        var owner = await SeedCompanyAsync();

        await using (var updateContext = fixture.CreateDbContext(owner))
        {
            var command = new UpdateCompanySettingsCommand(
                PieceworkDistributionMode.EqualAmongContributors, 10, 30, PayrollPeriodType.SemiMonthly, "USD");

            var updateResult = await new UpdateCompanySettingsCommandHandler(updateContext, owner)
                .Handle(command, CancellationToken.None);

            updateResult.IsSuccess.Should().BeTrue();
            updateResult.Value.PieceworkDistributionMode.Should().Be(PieceworkDistributionMode.EqualAmongContributors);
            updateResult.Value.LatenessGraceMinutes.Should().Be(10);
            updateResult.Value.LatenessNotifyThresholdMinutes.Should().Be(30);
            updateResult.Value.PayrollPeriodType.Should().Be(PayrollPeriodType.SemiMonthly);
            updateResult.Value.DefaultCurrency.Should().Be("USD");
        }

        await using var getContext = fixture.CreateDbContext(owner);
        var getResult = await new GetCurrentCompanyQueryHandler(getContext, owner).Handle(new GetCurrentCompanyQuery(), CancellationToken.None);

        getResult.IsSuccess.Should().BeTrue();
        getResult.Value.PieceworkDistributionMode.Should().Be(PieceworkDistributionMode.EqualAmongContributors);
        getResult.Value.LatenessGraceMinutes.Should().Be(10);
        getResult.Value.DefaultCurrency.Should().Be("USD");
    }

    [Fact]
    public async Task A_caller_from_another_company_cannot_see_or_update_this_one()
    {
        await SeedCompanyAsync();
        var stranger = new FixedCurrentUserService(Guid.NewGuid(), Guid.NewGuid(), Role.Owner);

        await using var context = fixture.CreateDbContext(stranger);
        var getResult = await new GetCurrentCompanyQueryHandler(context, stranger).Handle(new GetCurrentCompanyQuery(), CancellationToken.None);
        getResult.IsFailure.Should().BeTrue();
        getResult.Error.Code.Should().Be("COMPANY_NOT_FOUND");

        var updateResult = await new UpdateCompanySettingsCommandHandler(context, stranger).Handle(
            new UpdateCompanySettingsCommand(PieceworkDistributionMode.Manual, 0, 15, PayrollPeriodType.Monthly, "TJS"),
            CancellationToken.None);
        updateResult.IsFailure.Should().BeTrue();
        updateResult.Error.Code.Should().Be("COMPANY_NOT_FOUND");
    }
}

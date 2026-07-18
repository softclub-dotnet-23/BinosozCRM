using Application.Common.Interfaces;
using Application.Workers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

file sealed class TestCurrentUserService : ICurrentUserService
{
    public Guid? UserId => Guid.NewGuid();
    public Guid? CompanyId { get; set; }
    public Role? Role => Domain.Enums.Role.Prorab;
}

// MASTER §8.3, Phase 1 Step 7: age check runs against HireDate, not "today" —
// backdating a hire shouldn't let someone slip through just because they've
// since grown up. Hard 400 WORKER_UNDERAGE (§9.2), not a warning.
[Collection(PostgresCollection.Name)]
public sealed class CreateWorkerCommandHandlerTests(PostgresFixture fixture)
{
    private async Task<(Guid CompanyId, Guid BrigadeId)> SeedCompanyAndBrigadeAsync()
    {
        await using var context = fixture.CreateDbContext();

        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var brigade = Brigade.Create(company.Id, "Test Brigade");
        context.Companies.Add(company);
        context.Brigades.Add(brigade);
        await context.SaveChangesAsync(CancellationToken.None);

        return (company.Id, brigade.Id);
    }

    private static string RandomPhone() => $"+992{Random.Shared.NextInt64(100000000, 999999999)}";

    [Fact]
    public async Task Worker_turning_exactly_18_on_HireDate_is_allowed()
    {
        var (companyId, brigadeId) = await SeedCompanyAndBrigadeAsync();
        var hireDate = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1);
        var birthDate = hireDate.AddYears(-18);

        var currentUser = new TestCurrentUserService { CompanyId = companyId };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new CreateWorkerCommandHandler(context, currentUser);

        var result = await handler.Handle(
            new CreateWorkerCommand(brigadeId, "Ровно 18", RandomPhone(), birthDate, PayRateType.Hourly, 100m,
                hireDate, null, null, null, null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.BrigadeId.Should().Be(brigadeId);
    }

    [Fact]
    public async Task Worker_one_day_short_of_18_on_HireDate_is_rejected()
    {
        var (companyId, brigadeId) = await SeedCompanyAndBrigadeAsync();
        var hireDate = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1);
        var birthDate = hireDate.AddYears(-18).AddDays(1);

        var currentUser = new TestCurrentUserService { CompanyId = companyId };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new CreateWorkerCommandHandler(context, currentUser);

        var result = await handler.Handle(
            new CreateWorkerCommand(brigadeId, "На день младше", RandomPhone(), birthDate, PayRateType.Hourly, 100m,
                hireDate, null, null, null, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_UNDERAGE");
    }

    [Fact]
    public async Task Worker_who_is_18_today_but_was_under_18_on_a_backdated_HireDate_is_rejected()
    {
        var (companyId, brigadeId) = await SeedCompanyAndBrigadeAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var hireDate = today.AddYears(-2);
        var birthDate = today.AddYears(-19); // 19 today; 17 on the backdated HireDate

        var currentUser = new TestCurrentUserService { CompanyId = companyId };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new CreateWorkerCommandHandler(context, currentUser);

        var result = await handler.Handle(
            new CreateWorkerCommand(brigadeId, "Вырос уже", RandomPhone(), birthDate, PayRateType.Hourly, 100m,
                hireDate, null, null, null, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_UNDERAGE");
    }
}

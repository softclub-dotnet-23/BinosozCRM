using Application.Workers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §8.3: checked on HireDate, not today — a backdated HireDate must
// not pass just because the person has since grown up. Hard 400
// WORKER_UNDERAGE, not a warning.
[Collection(PostgresCollection.Name)]
public sealed class WorkerAgeGuardTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Actor, Guid BrigadeId)> SeedCompanyAndBrigadeAsync()
    {
        var companyId = Guid.NewGuid();
        var actor = new FixedCurrentUserService(companyId, role: Role.Owner);
        await using var context = fixture.CreateDbContext(actor);

        var company = Company.Create(companyId, $"Age Test Co {companyId}");
        var brigade = Brigade.Create(companyId, "Test Brigade");
        context.Companies.Add(company);
        context.Brigades.Add(brigade);
        await context.SaveChangesAsync(CancellationToken.None);

        return (actor, brigade.Id);
    }

    private static CreateWorkerCommand BuildCommand(Guid brigadeId, DateOnly birthDate, DateOnly hireDate) => new(
        brigadeId,
        "Test Worker",
        $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
        birthDate,
        PayRateType.Hourly,
        50m,
        hireDate,
        null, null, null, null, null);

    [Fact]
    public async Task Exactly_18_on_hire_date_is_allowed()
    {
        var (actor, brigadeId) = await SeedCompanyAndBrigadeAsync();
        await using var context = fixture.CreateDbContext(actor);
        var handler = new CreateWorkerCommandHandler(context, actor);

        // Birthday falls exactly on HireDate — turns 18 that day.
        var command = BuildCommand(brigadeId, new DateOnly(2000, 1, 15), new DateOnly(2018, 1, 15));
        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task One_day_short_of_18_is_rejected()
    {
        var (actor, brigadeId) = await SeedCompanyAndBrigadeAsync();
        await using var context = fixture.CreateDbContext(actor);
        var handler = new CreateWorkerCommandHandler(context, actor);

        // One day before their 18th birthday.
        var command = BuildCommand(brigadeId, new DateOnly(2000, 1, 15), new DateOnly(2018, 1, 14));
        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("WORKER_UNDERAGE");
    }

    [Fact]
    public async Task Backdated_hire_date_is_checked_against_age_at_hire_not_today()
    {
        var (actor, brigadeId) = await SeedCompanyAndBrigadeAsync();
        await using var context = fixture.CreateDbContext(actor);
        var handler = new CreateWorkerCommandHandler(context, actor);

        // Born 2008-07-01 — already 18 as of today (system clock is well
        // past 2026), but HireDate is backdated to their 16th birthday.
        // Must fail: the guard checks age *at HireDate*, not today.
        var command = BuildCommand(brigadeId, new DateOnly(2008, 7, 1), new DateOnly(2024, 7, 1));
        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("WORKER_UNDERAGE");
    }
}

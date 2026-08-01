using Application.Common.Interfaces;
using Application.Payroll;
using Application.PayrollAdvances;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class PayrollBackendAuditTests(PostgresFixture fixture)
{
    private static readonly FixedBusinessTimeProvider BusinessTime = new(DateTimeOffset.UtcNow);

    [Fact]
    public async Task Payroll_queries_and_creation_hide_another_companys_worker_and_entry()
    {
        var companyA = Company.Create(Guid.NewGuid(), "A");
        var companyB = Company.Create(Guid.NewGuid(), "B");
        var brigadeA = Brigade.Create(companyA.Id, "A brigade");
        var brigadeB = Brigade.Create(companyB.Id, "B brigade");
        var workerA = NewWorker(companyA.Id, brigadeA.Id, "A worker");
        var workerB = NewWorker(companyB.Id, brigadeB.Id, "B worker");
        var periodStart = new DateOnly(2026, 7, 1);
        var periodEnd = new DateOnly(2026, 7, 31);
        var entryB = PayrollEntry.Create(companyB.Id, workerB.Id, periodStart, periodEnd);

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.AddRange(companyA, companyB);
            seed.Brigades.AddRange(brigadeA, brigadeB);
            seed.Workers.AddRange(workerA, workerB);
            seed.PayrollEntries.Add(entryB);
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var actorA = new FixedCurrentUserService(companyA.Id, Guid.NewGuid(), Role.Accountant);
        await using var context = fixture.CreateDbContext(actorA);

        var create = await new CreatePayrollEntryCommandHandler(context, BusinessTime).Handle(
            new CreatePayrollEntryCommand(workerB.Id, periodStart, periodEnd), CancellationToken.None);
        var get = await new GetPayrollEntryQueryHandler(context, actorA).Handle(
            new GetPayrollEntryQuery(entryB.Id), CancellationToken.None);
        var list = await new ListPayrollEntriesQueryHandler(context, actorA).Handle(
            new ListPayrollEntriesQuery(1, 20), CancellationToken.None);

        create.IsFailure.Should().BeTrue();
        create.Error.Code.Should().Be("WORKER_NOT_FOUND");
        get.IsFailure.Should().BeTrue();
        get.Error.Code.Should().Be("PAYROLL_ENTRY_NOT_FOUND");
        list.Value.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task Draft_generator_persists_the_last_completed_period_for_the_company()
    {
        var company = Company.Create(Guid.NewGuid(), "Draft Co");
        var brigade = Brigade.Create(company.Id, "Draft brigade");
        var worker = NewWorker(company.Id, brigade.Id, "Draft worker");

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.Add(company);
            seed.Brigades.Add(brigade);
            seed.Workers.Add(worker);
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var today = new DateOnly(2026, 8, 10);
        await using (var context = fixture.CreateDbContext(new FixedCurrentUserService(company.Id)))
        {
            await PayrollDraftGenerator.GenerateForCompanyAsync(
                context, company, today, BusinessTime, NullLogger.Instance, CancellationToken.None);
        }

        await using var verify = fixture.CreateDbContext(new FixedCurrentUserService(company.Id));
        var entry = await verify.PayrollEntries.SingleAsync(p => p.WorkerId == worker.Id, CancellationToken.None);
        entry.PeriodStart.Should().Be(new DateOnly(2026, 7, 1));
        entry.PeriodEnd.Should().Be(new DateOnly(2026, 7, 31));
        entry.Status.Should().Be(PayrollEntryStatus.Draft);
    }

    private static Worker NewWorker(Guid companyId, Guid brigadeId, string name) => Worker.Create(
        companyId, brigadeId, name, $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
        new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1));
}

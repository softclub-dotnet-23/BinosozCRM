using Application.IndividualTasks;
using Application.Payroll;
using Application.Workers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §8.9 "Увольнение": on TerminationDate, an open IndividualTask
// blocks termination outright, and the worker's current PayrollEntry is
// formed early — shortened to end at TerminationDate rather than the
// natural period end, so an advance issued after termination doesn't leak
// into the final settlement. Permanent coverage, real Postgres via
// PostgresFixture.
[Collection(PostgresCollection.Name)]
public sealed class WorkerTerminationLifecycleTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid WorkerId, Guid ObjectId, Guid BrigadeId)> SeedWorkerAsync(decimal payRate)
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"Termination Test Co {companyId}");
        var customer = Customer.Create(companyId, "Acme");
        var constructionObject = ConstructionObject.Create(companyId, "Object A", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade A");
        var worker = Worker.Create(companyId, brigade.Id, "Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", new DateOnly(1990, 1, 1), PayRateType.Hourly, payRate, new DateOnly(2020, 1, 1));

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(constructionObject);
        context.Brigades.Add(brigade);
        context.Workers.Add(worker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner, worker.Id, constructionObject.Id, brigade.Id);
    }

    [Fact]
    public async Task Termination_with_an_open_individual_task_is_blocked()
    {
        var (owner, workerId, _, brigadeId) = await SeedWorkerAsync(40m);

        Guid taskId;
        await using (var context = fixture.CreateDbContext(owner))
        {
            var task = IndividualTask.Create(owner.CompanyId!.Value, "T-1", brigadeId, workerId, "Open task", owner.UserId!.Value, null, null, null);
            context.IndividualTasks.Add(task);
            await context.SaveChangesAsync(CancellationToken.None);
            taskId = task.Id;
        }

        await using var terminateContext = fixture.CreateDbContext(owner);
        var result = await new TerminateWorkerCommandHandler(terminateContext)
            .Handle(new TerminateWorkerCommand(workerId, new DateOnly(2026, 6, 15)), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_HAS_OPEN_TASKS");
        taskId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Termination_forms_an_early_shortened_draft_and_excludes_advances_issued_after_it()
    {
        // 10 approved days x 8h x 40/h = 3200 through June 15 (TerminationDate).
        // Advance issued June 5 (500) counts; advance issued June 20 (1000),
        // after TerminationDate, must NOT — proves PeriodEnd was actually
        // shortened, not left at the natural June 30 end.
        var (owner, workerId, objectId, _) = await SeedWorkerAsync(40m);
        var terminationDate = new DateOnly(2026, 6, 15);

        await using (var context = fixture.CreateDbContext(owner))
        {
            for (var i = 0; i < 10; i++)
            {
                var date = new DateOnly(2026, 6, 1).AddDays(i);
                var ts = Timesheet.Create(owner.CompanyId!.Value, workerId, objectId, date, new TimeOnly(8, 0));
                ts.CheckIn(new DateTimeOffset(date, new TimeOnly(8, 0), TimeSpan.Zero), 0);
                ts.CheckOut(new DateTimeOffset(date, new TimeOnly(16, 0), TimeSpan.Zero));
                ts.Approve(owner.UserId!.Value, DateTimeOffset.UtcNow);
                context.Timesheets.Add(ts);
            }

            context.PayrollAdvances.Add(PayrollAdvance.Create(
                owner.CompanyId!.Value, workerId, 500m, new DateTimeOffset(2026, 6, 5, 0, 0, 0, TimeSpan.Zero), owner.UserId!.Value));
            context.PayrollAdvances.Add(PayrollAdvance.Create(
                owner.CompanyId!.Value, workerId, 1000m, new DateTimeOffset(2026, 6, 20, 0, 0, 0, TimeSpan.Zero), owner.UserId!.Value));

            await context.SaveChangesAsync(CancellationToken.None);
        }

        await using (var terminateContext = fixture.CreateDbContext(owner))
        {
            var result = await new TerminateWorkerCommandHandler(terminateContext)
                .Handle(new TerminateWorkerCommand(workerId, terminationDate), CancellationToken.None);
            result.IsSuccess.Should().BeTrue();
        }

        await using var readContext = fixture.CreateDbContext(owner);
        var entry = readContext.PayrollEntries.Single(p => p.WorkerId == workerId);

        entry.PeriodStart.Should().Be(new DateOnly(2026, 6, 1));
        entry.PeriodEnd.Should().Be(terminationDate);
        entry.CalculatedAmount.Should().Be(3200m);
        entry.AdvanceDeductedAmount.Should().Be(500m);
        entry.Status.Should().Be(PayrollEntryStatus.Draft);

        var worker = readContext.Workers.Single(w => w.Id == workerId);
        worker.IsActive.Should().BeFalse();
        worker.TerminationDate.Should().Be(terminationDate);
    }

    [Fact]
    public async Task Termination_shortens_an_existing_full_period_draft_instead_of_creating_a_second_row()
    {
        var (owner, workerId, _, _) = await SeedWorkerAsync(40m);
        var periodStart = new DateOnly(2026, 6, 1);
        var terminationDate = new DateOnly(2026, 6, 10);

        await using (var context = fixture.CreateDbContext(owner))
        {
            var existingDraft = PayrollEntry.Create(owner.CompanyId!.Value, workerId, periodStart, new DateOnly(2026, 6, 30));
            context.PayrollEntries.Add(existingDraft);
            await context.SaveChangesAsync(CancellationToken.None);
        }

        await using (var terminateContext = fixture.CreateDbContext(owner))
        {
            var result = await new TerminateWorkerCommandHandler(terminateContext)
                .Handle(new TerminateWorkerCommand(workerId, terminationDate), CancellationToken.None);
            result.IsSuccess.Should().BeTrue();
        }

        await using var readContext = fixture.CreateDbContext(owner);
        var entries = readContext.PayrollEntries.Where(p => p.WorkerId == workerId).ToList();

        entries.Should().ContainSingle();
        entries[0].PeriodEnd.Should().Be(terminationDate);
    }
}

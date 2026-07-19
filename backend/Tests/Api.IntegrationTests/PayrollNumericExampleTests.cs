using Application.Payroll;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §8.0/§8.1/§8.8's own worked numeric examples, permanent
// coverage via GeneratePayrollDraftCommandHandler/ApprovePayrollEntryCommandHandler
// against real Postgres (PostgresFixture) — the same three scenarios
// verified with throwaway InMemory checks while building Phase 5 Steps
// 3/4/7, now kept for real.
[Collection(PostgresCollection.Name)]
public sealed class PayrollNumericExampleTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid WorkerId, Guid ObjectId)> SeedWorkerAsync(decimal payRate)
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"Payroll Numeric Test Co {companyId}");
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

        return (owner, worker.Id, constructionObject.Id);
    }

    [Fact]
    public async Task Hourly_CalculatedAmount_matches_MASTER_8_0_worked_example_7040()
    {
        // §8.0: rate 40/h, 20 days x 8h = 160h worked + 2 paid sick days,
        // average daily = 8h -> 160*40 + 2*8*40 = 6400 + 640 = 7040.
        var (owner, workerId, objectId) = await SeedWorkerAsync(40m);
        var periodStart = new DateOnly(2026, 6, 1);
        var periodEnd = new DateOnly(2026, 6, 30);

        await using (var context = fixture.CreateDbContext(owner))
        {
            for (var i = 0; i < 20; i++)
            {
                var date = periodStart.AddDays(i);
                var ts = Timesheet.Create(owner.CompanyId!.Value, workerId, objectId, date, new TimeOnly(8, 0));
                ts.CheckIn(new DateTimeOffset(date, new TimeOnly(8, 0), TimeSpan.Zero), 0);
                ts.CheckOut(new DateTimeOffset(date, new TimeOnly(16, 0), TimeSpan.Zero));
                ts.Approve(owner.UserId!.Value, DateTimeOffset.UtcNow);
                context.Timesheets.Add(ts);
            }

            context.AbsenceRecords.Add(AbsenceRecord.Create(
                owner.CompanyId!.Value, workerId, periodStart.AddDays(25), periodStart.AddDays(26), AbsenceType.SickLeave, isPaid: true));

            await context.SaveChangesAsync(CancellationToken.None);
        }

        await using var draftContext = fixture.CreateDbContext(owner);
        var result = await new GeneratePayrollDraftCommandHandler(draftContext)
            .Handle(new GeneratePayrollDraftCommand(periodStart, periodEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle(e => e.WorkerId == workerId && e.CalculatedAmount == 7040m);
    }

    [Theory]
    [InlineData(0, 43.33)]
    [InlineData(5, 33.33)]
    public async Task LatenessDeductionAmount_matches_MASTER_8_1_worked_examples(int graceMinutes, decimal expectedDeduction)
    {
        // §8.1: rate 40/h. Grace=0: late minutes 15,0,40,10,0 -> Sigma=65
        // -> 65*(40/60)=43.33. Grace=5: 10,0,35,5,0 -> Sigma=50 ->
        // 50*(40/60)=33.33.
        var (owner, workerId, objectId) = await SeedWorkerAsync(40m);
        var periodStart = new DateOnly(2026, 6, 1);
        var periodEnd = new DateOnly(2026, 6, 30);
        var minutesLate = new[] { 15, 0, 40, 10, 0 };

        await using (var context = fixture.CreateDbContext(owner))
        {
            for (var i = 0; i < minutesLate.Length; i++)
            {
                var date = periodStart.AddDays(i);
                var plannedStart = new TimeOnly(8, 0);
                var ts = Timesheet.Create(owner.CompanyId!.Value, workerId, objectId, date, plannedStart);
                var plannedStartAt = new DateTimeOffset(date, plannedStart, TimeSpan.Zero);
                ts.CheckIn(plannedStartAt.AddMinutes(minutesLate[i]), graceMinutes);
                context.Timesheets.Add(ts);
            }

            await context.SaveChangesAsync(CancellationToken.None);
        }

        await using var draftContext = fixture.CreateDbContext(owner);
        var result = await new GeneratePayrollDraftCommandHandler(draftContext)
            .Handle(new GeneratePayrollDraftCommand(periodStart, periodEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var entry = result.Value.Single(e => e.WorkerId == workerId);
        Math.Round(entry.LatenessDeductionAmount, 2).Should().Be(expectedDeduction);
    }

    [Fact]
    public async Task FinalAmount_matches_MASTER_8_8_combined_worked_example_4196_67()
    {
        // §8.8: CalculatedAmount=7040, опоздания -43.33, премия +200,
        // аванс 3000 -> FinalAmount = 7040 - 43.33 + 200 - 3000 = 4196.67.
        var (owner, workerId, _) = await SeedWorkerAsync(40m);
        var periodStart = new DateOnly(2026, 6, 1);
        var periodEnd = new DateOnly(2026, 6, 30);

        Guid entryId;
        await using (var context = fixture.CreateDbContext(owner))
        {
            var entry = PayrollEntry.Create(owner.CompanyId!.Value, workerId, periodStart, periodEnd);
            entry.UpdateDraft(7040m, 43.33m, 200m, 3000m);
            context.PayrollEntries.Add(entry);
            await context.SaveChangesAsync(CancellationToken.None);
            entryId = entry.Id;
        }

        await using var approveContext = fixture.CreateDbContext(owner);
        var result = await new ApprovePayrollEntryCommandHandler(approveContext)
            .Handle(new ApprovePayrollEntryCommand(entryId, null, null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.FinalAmount.Should().Be(4196.67m);
        result.Value.Status.Should().Be(PayrollEntryStatus.Approved);
    }
}

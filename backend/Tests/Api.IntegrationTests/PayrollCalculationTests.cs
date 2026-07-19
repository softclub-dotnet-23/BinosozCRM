using Application.Common.Interfaces;
using Application.Payroll;
using Application.PayrollAdvances;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

file sealed class TestCurrentUserService : ICurrentUserService
{
    public Guid? UserId { get; set; }
    public Guid? CompanyId { get; set; }
    public Role? Role { get; set; }
}

// MASTER §8.0/§8.1/§8.8's own worked numeric examples, promoted from
// Phase 5 Steps 3/4/6/7's throwaway checks into permanent coverage — same
// split convention as Phase 2 Step 9 / Phase 3 Step 7 / Phase 4 Step 6.
[Collection(PostgresCollection.Name)]
public sealed class PayrollCalculationTests(PostgresFixture fixture)
{
    private static (DateOnly PeriodStart, DateOnly PeriodEnd) CurrentPeriod()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = new DateOnly(today.Year, today.Month, 1);
        return (start, start.AddMonths(1).AddDays(-1));
    }

    private static ICurrentUserService AsAccountant(Guid companyId, Guid userId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = userId, Role = Domain.Enums.Role.Accountant };

    // §8.0 Hourly: rate 40/hour, 20 days x 8h approved + 2 paid sick days
    // at the same 8h average -> 160*40 + 2*8*40 = 7040.
    [Fact]
    public async Task Hourly_CalculatedAmount_matches_MASTER_example_exactly()
    {
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var (periodStart, periodEnd) = CurrentPeriod();
        var worker = Worker.Create(company.Id, brigade.Id, "Hourly Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1));
        var prorabUser = User.Create("Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Prorab);

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.Add(company);
            seed.Customers.Add(customer);
            seed.ConstructionObjects.Add(obj);
            seed.Brigades.Add(brigade);
            seed.Users.Add(prorabUser);
            seed.Workers.Add(worker);

            for (var i = 0; i < 20; i++)
            {
                var date = periodStart.AddDays(i);
                var ts = Timesheet.Create(company.Id, worker.Id, obj.Id, date, new TimeOnly(8, 0));
                ts.CheckIn(new DateTimeOffset(date, new TimeOnly(8, 0), TimeSpan.Zero), 0);
                ts.CheckOut(new DateTimeOffset(date, new TimeOnly(16, 0), TimeSpan.Zero));
                ts.Approve(prorabUser.Id, DateTimeOffset.UtcNow);
                seed.Timesheets.Add(ts);
            }

            seed.AbsenceRecords.Add(AbsenceRecord.Create(
                company.Id, worker.Id, periodStart.AddDays(25), periodStart.AddDays(26), AbsenceType.SickLeave, isPaid: true));

            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var accountant = AsAccountant(company.Id, Guid.NewGuid());
        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context).Handle(
            new CreatePayrollEntryCommand(worker.Id, periodStart, periodEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CalculatedAmount.Should().Be(7040.00m);
    }

    // §8.0 Piecework: plastering, UnitPrice 120/m2, 45m2 reported ->
    // OrderTotal 5400, split 50/30/20 -> 2700/1620/1080.
    [Theory]
    [InlineData(50, 2700.00)]
    [InlineData(30, 1620.00)]
    [InlineData(20, 1080.00)]
    public async Task Piecework_CalculatedAmount_matches_MASTER_example_exactly(decimal sharePercent, decimal expectedAmount)
    {
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var (periodStart, periodEnd) = CurrentPeriod();
        var worker = Worker.Create(company.Id, brigade.Id, "Piecework Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Piecework, 0m, new DateOnly(2020, 1, 1));
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Brigadir);

        var workOrder = WorkOrder.Create(company.Id, $"BR-{Guid.NewGuid():N}"[..12], obj.Id, brigade.Id, "Plaster", "m2", 50m, 120m, brigadirUser.Id);
        workOrder.Assign(periodStart);
        workOrder.Start();
        var progress = WorkOrderProgress.Create(company.Id, workOrder.Id, brigadirUser.Id, 45m, DateTimeOffset.UtcNow);
        var share = WorkOrderPayoutShare.Create(company.Id, workOrder.Id, worker.Id, sharePercent, brigadirUser.Id);

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.Add(company);
            seed.Customers.Add(customer);
            seed.ConstructionObjects.Add(obj);
            seed.Brigades.Add(brigade);
            seed.Users.Add(brigadirUser);
            seed.Workers.Add(worker);
            seed.WorkOrders.Add(workOrder);
            seed.WorkOrderProgresses.Add(progress);
            seed.WorkOrderPayoutShares.Add(share);
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var accountant = AsAccountant(company.Id, Guid.NewGuid());
        await using (var accept = fixture.CreateDbContext(accountant))
        {
            var wo = accept.WorkOrders.Single(w => w.Id == workOrder.Id);
            wo.SubmitForReview(hasProgress: true, payoutShareComplete: true);
            wo.Accept(periodStart.AddDays(10));
            await accept.SaveChangesAsync(CancellationToken.None);
        }

        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context).Handle(
            new CreatePayrollEntryCommand(worker.Id, periodStart, periodEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CalculatedAmount.Should().Be(expectedAmount);
    }

    // §8.1: same five raw lateness minutes (15, 0, 40, 10, 0) under two
    // grace settings -> 65min/43.33 at grace=0, 50min/33.33 at grace=5.
    [Theory]
    [InlineData(0, 43.33)]
    [InlineData(5, 33.33)]
    public async Task LatenessDeductionAmount_matches_MASTER_examples_exactly(int graceMinutes, decimal expectedDeduction)
    {
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var (periodStart, periodEnd) = CurrentPeriod();
        var worker = Worker.Create(company.Id, brigade.Id, "Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1));
        var prorabUser = User.Create("Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Prorab);

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.Add(company);
            seed.Customers.Add(customer);
            seed.ConstructionObjects.Add(obj);
            seed.Brigades.Add(brigade);
            seed.Users.Add(prorabUser);
            seed.Workers.Add(worker);

            int[] rawLateMinutes = [15, 0, 40, 10, 0];
            for (var i = 0; i < rawLateMinutes.Length; i++)
            {
                var date = periodStart.AddDays(i);
                var plannedStart = new TimeOnly(8, 0);
                var ts = Timesheet.Create(company.Id, worker.Id, obj.Id, date, plannedStart);
                var checkInAt = new DateTimeOffset(date, plannedStart, TimeSpan.Zero).AddMinutes(rawLateMinutes[i]);
                ts.CheckIn(checkInAt, graceMinutes);
                ts.CheckOut(checkInAt.AddHours(8));
                ts.Approve(prorabUser.Id, DateTimeOffset.UtcNow);
                seed.Timesheets.Add(ts);
            }

            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var accountant = AsAccountant(company.Id, Guid.NewGuid());
        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context).Handle(
            new CreatePayrollEntryCommand(worker.Id, periodStart, periodEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.LatenessDeductionAmount.Should().Be(expectedDeduction);
    }

    // §8.8: CalculatedAmount 7040, lateness -43.33, bonus +200, advance
    // 3000 -> FinalAmount = 7040 - 43.33 + 200 - 3000 = 4196.67.
    [Fact]
    public async Task FinalAmount_matches_MASTER_worked_example_exactly()
    {
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var (periodStart, periodEnd) = CurrentPeriod();
        var worker = Worker.Create(company.Id, brigade.Id, "Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1));
        var prorabUser = User.Create("Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Prorab);
        var accountantUser = User.Create("Accountant", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Accountant);

        int[] rawLateMinutes = [15, 0, 40, 10, 0];
        var timesheets = new List<Timesheet>();
        for (var i = 0; i < 20; i++)
        {
            var date = periodStart.AddDays(i);
            var plannedStart = new TimeOnly(8, 0);
            var lateMinutes = i < rawLateMinutes.Length ? rawLateMinutes[i] : 0;
            var checkInAt = new DateTimeOffset(date, plannedStart, TimeSpan.Zero).AddMinutes(lateMinutes);
            var ts = Timesheet.Create(company.Id, worker.Id, obj.Id, date, plannedStart);
            ts.CheckIn(checkInAt, 0);
            ts.CheckOut(checkInAt.AddHours(8));
            ts.Approve(prorabUser.Id, DateTimeOffset.UtcNow);
            timesheets.Add(ts);
        }

        var task = IndividualTask.Create(company.Id, "T-BONUS", brigade.Id, worker.Id, "Task", prorabUser.Id,
            dueAt: new DateTimeOffset(periodStart.AddDays(20), new TimeOnly(9, 0), TimeSpan.Zero));
        task.Start(new DateTimeOffset(periodStart, new TimeOnly(9, 0), TimeSpan.Zero));
        task.Complete(new DateTimeOffset(periodStart.AddDays(15), new TimeOnly(9, 0), TimeSpan.Zero)); // before DueAt -> CompletedEarly
        task.ProposeBonus(200m);
        task.ApproveBonus(prorabUser.Id);

        var absence = AbsenceRecord.Create(
            company.Id, worker.Id, periodStart.AddDays(25), periodStart.AddDays(26), AbsenceType.SickLeave, isPaid: true);

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.Add(company);
            seed.Customers.Add(customer);
            seed.ConstructionObjects.Add(obj);
            seed.Brigades.Add(brigade);
            seed.Users.AddRange(prorabUser, accountantUser);
            seed.Workers.Add(worker);
            seed.Timesheets.AddRange(timesheets);
            seed.IndividualTasks.Add(task);
            seed.AbsenceRecords.Add(absence);
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var accountant = AsAccountant(company.Id, accountantUser.Id);
        await using (var context = fixture.CreateDbContext(accountant))
            await new CreatePayrollAdvanceCommandHandler(context, accountant).Handle(
                new CreatePayrollAdvanceCommand(worker.Id, 3000m, null), CancellationToken.None);

        Guid entryId;
        await using (var context = fixture.CreateDbContext(accountant))
        {
            var createResult = await new CreatePayrollEntryCommandHandler(context).Handle(
                new CreatePayrollEntryCommand(worker.Id, periodStart, periodEnd), CancellationToken.None);
            createResult.Value.CalculatedAmount.Should().Be(7040.00m);
            createResult.Value.LatenessDeductionAmount.Should().Be(43.33m);
            createResult.Value.BonusAmount.Should().Be(200.00m);
            createResult.Value.AdvanceDeductedAmount.Should().Be(3000.00m);
            entryId = createResult.Value.Id;
        }

        await using var approveContext = fixture.CreateDbContext(accountant);
        var approveResult = await new ApprovePayrollEntryCommandHandler(approveContext).Handle(
            new ApprovePayrollEntryCommand(entryId), CancellationToken.None);

        approveResult.IsSuccess.Should().BeTrue();
        approveResult.Value.FinalAmount.Should().Be(4196.67m);
    }

    [Fact]
    public async Task A_negative_FinalAmount_is_not_clamped_to_zero()
    {
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var brigade = Brigade.Create(company.Id, "Brigade");
        var (periodStart, periodEnd) = CurrentPeriod();
        var worker = Worker.Create(company.Id, brigade.Id, "Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1));
        var accountantUser = User.Create("Accountant", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Accountant);

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.Add(company);
            seed.Brigades.Add(brigade);
            seed.Users.Add(accountantUser);
            seed.Workers.Add(worker);
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var accountant = AsAccountant(company.Id, accountantUser.Id);
        await using (var context = fixture.CreateDbContext(accountant))
            await new CreatePayrollAdvanceCommandHandler(context, accountant).Handle(
                new CreatePayrollAdvanceCommand(worker.Id, 10000m, null), CancellationToken.None);

        Guid entryId;
        await using (var context = fixture.CreateDbContext(accountant))
        {
            var createResult = await new CreatePayrollEntryCommandHandler(context).Handle(
                new CreatePayrollEntryCommand(worker.Id, periodStart, periodEnd), CancellationToken.None);
            createResult.Value.CalculatedAmount.Should().Be(0m);
            entryId = createResult.Value.Id;
        }

        await using var approveContext = fixture.CreateDbContext(accountant);
        var approveResult = await new ApprovePayrollEntryCommandHandler(approveContext).Handle(
            new ApprovePayrollEntryCommand(entryId), CancellationToken.None);

        approveResult.IsSuccess.Should().BeTrue();
        approveResult.Value.FinalAmount.Should().Be(-10000.00m);
    }

    // §8.0 boundary case: "Нет ни одного принятого табеля / ни одного
    // наряда -> CalculatedAmount = 0, PayrollEntry всё равно создаётся."
    [Fact]
    public async Task No_timesheets_and_no_work_orders_still_creates_a_Draft_at_zero()
    {
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var brigade = Brigade.Create(company.Id, "Brigade");
        var (periodStart, periodEnd) = CurrentPeriod();
        var worker = Worker.Create(company.Id, brigade.Id, "Idle Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1));

        await using (var seed = fixture.CreateDbContext())
        {
            seed.Companies.Add(company);
            seed.Brigades.Add(brigade);
            seed.Workers.Add(worker);
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        var accountant = AsAccountant(company.Id, Guid.NewGuid());
        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context).Handle(
            new CreatePayrollEntryCommand(worker.Id, periodStart, periodEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CalculatedAmount.Should().Be(0m);
        result.Value.Status.Should().Be(PayrollEntryStatus.Draft);
    }
}

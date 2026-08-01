using Application.Reports;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// Real PostgreSQL coverage for the read model behind GET /reports/actual-cost.
// HTTP auth/pipeline behaviour belongs to the API smoke suite; these tests
// exercise the financial allocation, tenant filter, and Prorab object scope.
[Collection(PostgresCollection.Name)]
public sealed class ActualCostReportTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Owner_report_uses_effective_rates_approved_piecework_and_reconciles_paid_payroll()
    {
        var companyId = Guid.NewGuid();
        var periodStart = new DateOnly(2026, 6, 1);
        var periodEnd = periodStart.AddMonths(1).AddDays(-1);
        var company = Company.Create(companyId, $"Actual cost {companyId}");
        var ownerUser = User.Create(companyId, "Owner", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Owner);
        var owner = new FixedCurrentUserService(companyId, ownerUser.Id, Role.Owner);
        var customer = Customer.Create(companyId, "Customer");
        var objectA = ConstructionObject.Create(companyId, "Object A", customer.Id);
        var objectB = ConstructionObject.Create(companyId, "Object B", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade");
        var hourlyWorker = Worker.Create(companyId, brigade.Id, "Hourly worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 20m, new DateOnly(2020, 1, 1));
        var pieceworkWorker = Worker.Create(companyId, brigade.Id, "Piecework worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1991, 1, 1), PayRateType.Piecework, 0m, new DateOnly(2020, 1, 1));

        var workOrder = WorkOrder.Create(companyId, "REPORT-1", objectA.Id, brigade.Id, "Approved work", "m2", 1m, 120m, ownerUser.Id);
        workOrder.Assign(periodStart);
        workOrder.Start();
        workOrder.SubmitForReview(hasProgress: true, payoutShareComplete: true);
        workOrder.Accept(periodStart.AddDays(2));
        var payoutShare = WorkOrderPayoutShare.Create(companyId, workOrder.Id, pieceworkWorker.Id, 100m, ownerUser.Id);
        payoutShare.Approve(ownerUser.Id, 120m);

        var hourlyEntry = CreatePaidEntry(companyId, hourlyWorker.Id, periodStart, periodEnd, 80m, bonus: 30m, advance: 12m, lateness: 5m, adjustment: -3m);
        var pieceworkEntry = CreatePaidEntry(companyId, pieceworkWorker.Id, periodStart, periodEnd, 120m, bonus: 10m);

        await using (var seed = fixture.CreateDbContext(owner))
        {
            seed.AddRange(
                company, ownerUser, customer, objectA, objectB, brigade, hourlyWorker, pieceworkWorker,
                WorkerPayRateHistory.Create(companyId, hourlyWorker.Id, PayRateType.Hourly, 10m, periodStart),
                WorkerPayRateHistory.Create(companyId, hourlyWorker.Id, PayRateType.Hourly, 20m, periodStart.AddDays(1)),
                WorkerPayRateHistory.Create(companyId, pieceworkWorker.Id, PayRateType.Piecework, 0m, periodStart),
                CreateApprovedTimesheet(companyId, hourlyWorker.Id, objectA.Id, periodStart, 2m, ownerUser.Id),
                CreateApprovedTimesheet(companyId, hourlyWorker.Id, objectB.Id, periodStart.AddDays(1), 3m, ownerUser.Id),
                CreateApprovedTimesheet(companyId, pieceworkWorker.Id, objectA.Id, periodStart, 1m, ownerUser.Id),
                CreateApprovedTimesheet(companyId, pieceworkWorker.Id, objectB.Id, periodStart.AddDays(1), 1m, ownerUser.Id),
                workOrder, payoutShare, hourlyEntry, pieceworkEntry,
                MaterialDelivery.Create(companyId, objectA.Id, "Cement", "bag", 10m, 10m, new DateTimeOffset(2026, 6, 10, 9, 0, 0, TimeSpan.Zero)),
                MaterialDelivery.Create(companyId, objectB.Id, "Sand", "bag", 5m, 10m, new DateTimeOffset(2026, 6, 11, 9, 0, 0, TimeSpan.Zero)));
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        await using var context = fixture.CreateDbContext(owner);
        var result = await new GetActualCostReportQueryHandler(context, owner)
            .Handle(new GetActualCostReportQuery(periodStart, periodEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var report = result.Value;
        var lineA = report.Lines.Single(line => line.ObjectId == objectA.Id);
        var lineB = report.Lines.Single(line => line.ObjectId == objectB.Id);

        // Object B's 3 hours use the new 20/hour rate, not the mutable
        // worker rate or Object A's earlier 10/hour rate.
        lineA.MaterialCost.Should().Be(100m);
        lineA.PieceworkCost.Should().Be(120m);
        lineA.HourlyCost.Should().Be(20m);
        lineA.BonusAmount.Should().Be(17m);
        lineA.AdvanceDeductedAmount.Should().Be(4.8m);
        lineA.LatenessDeductionAmount.Should().Be(2m);
        lineA.AdjustmentAmount.Should().Be(-1.2m);
        lineA.TotalCost.Should().Be(249m);

        lineB.MaterialCost.Should().Be(50m);
        lineB.PieceworkCost.Should().Be(0m);
        lineB.HourlyCost.Should().Be(60m);
        lineB.BonusAmount.Should().Be(23m);
        lineB.AdvanceDeductedAmount.Should().Be(7.2m);
        lineB.LatenessDeductionAmount.Should().Be(3m);
        lineB.AdjustmentAmount.Should().Be(-1.8m);
        lineB.TotalCost.Should().Be(121m);
        report.Lines.Should().NotContain(line => line.ObjectId == null);

        var allocatedPayroll = report.Lines.Sum(line => line.PieceworkCost + line.HourlyCost + line.BonusAmount
            - line.AdvanceDeductedAmount - line.LatenessDeductionAmount + line.AdjustmentAmount);
        allocatedPayroll.Should().Be(220m); // 90 + 130 paid PayrollEntry.FinalAmount values.
        report.TotalCost.Should().Be(370m);
    }

    [Fact]
    public async Task Zero_hours_go_to_general_and_explicit_prorab_scope_does_not_leak_other_objects_or_companies()
    {
        var companyId = Guid.NewGuid();
        var foreignCompanyId = Guid.NewGuid();
        var periodStart = new DateOnly(2026, 7, 1);
        var periodEnd = periodStart.AddMonths(1).AddDays(-1);
        var company = Company.Create(companyId, $"Scoped actual cost {companyId}");
        var foreignCompany = Company.Create(foreignCompanyId, $"Foreign actual cost {foreignCompanyId}");
        var ownerUser = User.Create(companyId, "Owner", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Owner);
        var prorabUser = User.Create(companyId, "Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var owner = new FixedCurrentUserService(companyId, ownerUser.Id, Role.Owner);
        var prorab = new FixedCurrentUserService(companyId, prorabUser.Id, Role.Prorab);
        var customer = Customer.Create(companyId, "Customer");
        var foreignCustomer = Customer.Create(foreignCompanyId, "Foreign customer");
        var objectA = ConstructionObject.Create(companyId, "Scoped A", customer.Id);
        var objectB = ConstructionObject.Create(companyId, "Hidden B", customer.Id);
        var foreignObject = ConstructionObject.Create(foreignCompanyId, "Foreign object", foreignCustomer.Id);
        var brigade = Brigade.Create(companyId, "Brigade");
        var foreignBrigade = Brigade.Create(foreignCompanyId, "Foreign brigade");
        var worker = Worker.Create(companyId, brigade.Id, "Scoped worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1));
        var noHoursWorker = Worker.Create(companyId, brigade.Id, "No hours worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1991, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1));
        var foreignWorker = Worker.Create(foreignCompanyId, foreignBrigade.Id, "Foreign worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1992, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1));

        await using (var seed = fixture.CreateDbContext(owner))
        {
            seed.AddRange(
                company, foreignCompany, ownerUser, prorabUser, customer, foreignCustomer,
                objectA, objectB, foreignObject, brigade, foreignBrigade, worker, noHoursWorker, foreignWorker,
                CreateApprovedTimesheet(companyId, worker.Id, objectA.Id, periodStart, 1m, prorabUser.Id),
                CreateApprovedTimesheet(companyId, worker.Id, objectB.Id, periodStart.AddDays(1), 1m, prorabUser.Id),
                CreatePaidEntry(companyId, worker.Id, periodStart, periodEnd, 100m, bonus: 20m),
                CreatePaidEntry(companyId, noHoursWorker.Id, periodStart, periodEnd, 0m, bonus: 50m, advance: 10m, lateness: 3m, adjustment: -7m),
                CreatePaidEntry(foreignCompanyId, foreignWorker.Id, periodStart, periodEnd, 999m),
                MaterialDelivery.Create(foreignCompanyId, foreignObject.Id, "Foreign material", "bag", 1m, 999m, new DateTimeOffset(2026, 7, 10, 9, 0, 0, TimeSpan.Zero)),
                ProrabObjectAssignment.Create(companyId, prorabUser.Id, objectA.Id, DateTimeOffset.UtcNow, ownerUser.Id));
            await seed.SaveChangesAsync(CancellationToken.None);
        }

        await using (var ownerContext = fixture.CreateDbContext(owner))
        {
            var ownerResult = await new GetActualCostReportQueryHandler(ownerContext, owner)
                .Handle(new GetActualCostReportQuery(periodStart, periodEnd), CancellationToken.None);

            ownerResult.IsSuccess.Should().BeTrue();
            var general = ownerResult.Value.Lines.Single(line => line.ObjectId == null);
            general.ObjectName.Should().Be("Общие");
            general.BonusAmount.Should().Be(50m);
            general.AdvanceDeductedAmount.Should().Be(10m);
            general.LatenessDeductionAmount.Should().Be(3m);
            general.AdjustmentAmount.Should().Be(-7m);
            general.TotalCost.Should().Be(30m);
            ownerResult.Value.Lines.Should().NotContain(line => line.ObjectId == foreignObject.Id);
        }

        await using var prorabContext = fixture.CreateDbContext(prorab);
        var prorabResult = await new GetActualCostReportQueryHandler(prorabContext, prorab)
            .Handle(new GetActualCostReportQuery(periodStart, periodEnd), CancellationToken.None);

        prorabResult.IsSuccess.Should().BeTrue();
        prorabResult.Value.Lines.Should().ContainSingle();
        var scopedLine = prorabResult.Value.Lines.Single();
        scopedLine.ObjectId.Should().Be(objectA.Id);
        scopedLine.ObjectName.Should().Be("Scoped A");
        scopedLine.HourlyCost.Should().Be(50m);
        scopedLine.BonusAmount.Should().Be(10m);
        scopedLine.TotalCost.Should().Be(60m);
        prorabResult.Value.Lines.Should().NotContain(line => line.ObjectId == null || line.ObjectId == objectB.Id || line.ObjectId == foreignObject.Id);
    }

    private static PayrollEntry CreatePaidEntry(
        Guid companyId,
        Guid workerId,
        DateOnly periodStart,
        DateOnly periodEnd,
        decimal calculated,
        decimal bonus = 0m,
        decimal advance = 0m,
        decimal lateness = 0m,
        decimal adjustment = 0m)
    {
        var entry = PayrollEntry.Create(companyId, workerId, periodStart, periodEnd);
        entry.UpdateDraft(calculated, lateness, bonus, advance).IsSuccess.Should().BeTrue();
        if (adjustment != 0m)
            entry.Adjust(adjustment, "Report allocation test").IsSuccess.Should().BeTrue();
        entry.Approve().IsSuccess.Should().BeTrue();
        entry.Pay(DateTimeOffset.UtcNow).IsSuccess.Should().BeTrue();
        return entry;
    }

    private static Timesheet CreateApprovedTimesheet(Guid companyId, Guid workerId, Guid objectId, DateOnly date, decimal hours, Guid approvedByUserId)
    {
        var timesheet = Timesheet.Create(companyId, workerId, objectId, date, new TimeOnly(8, 0));
        var checkIn = new DateTimeOffset(date, new TimeOnly(8, 0), TimeSpan.Zero);
        timesheet.CheckIn(checkIn, 0);
        timesheet.CheckOut(checkIn.AddHours((double)hours));
        timesheet.Approve(approvedByUserId, DateTimeOffset.UtcNow);
        return timesheet;
    }
}

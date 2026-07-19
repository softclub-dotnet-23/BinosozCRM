using Application.Common.Interfaces;
using Application.Timesheets;
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

// MASTER §8.1 (LateMinutes formula + both worked numeric examples), §8.9
// (attendance vs. absence conflict). Phase 3 Step 7 — promotes what Steps
// 1-2 only verified via throwaway checks into permanent coverage.
[Collection(PostgresCollection.Name)]
public sealed class TimesheetTests(PostgresFixture fixture)
{
    // hasShiftStartTime, not a nullable TimeOnly? with a "?? default"
    // fallback — that pattern can't distinguish "caller passed null on
    // purpose" from "caller omitted the argument", which silently defeated
    // the one test that needs ShiftStartTime genuinely unset.
    private async Task<(Guid CompanyId, Guid ObjectId, Guid BrigadirId, Guid WorkerId)> SeedAsync(
        int latenessGraceMinutes = 0, bool hasShiftStartTime = true)
    {
        await using var context = fixture.CreateDbContext();
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        company.UpdateSettings(PieceworkDistributionMode.Manual, latenessGraceMinutes, 15, PayrollPeriodType.Monthly, "TJS");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var worker = Worker.Create(company.Id, brigade.Id, "Worker", "+992000000001",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1),
            userId: brigadirUser.Id, shiftStartTime: hasShiftStartTime ? new TimeOnly(8, 0) : null);

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(obj);
        context.Brigades.Add(brigade);
        context.Users.Add(brigadirUser);
        context.Workers.Add(worker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (company.Id, obj.Id, brigadirUser.Id, worker.Id);
    }

    private static ICurrentUserService AsBrigadir(Guid companyId, Guid brigadirId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = brigadirId, Role = Role.Brigadir };

    // MASTER §8.1's two worked examples, each a list of 5 check-ins over a
    // month — testing the per-check-in LateMinutes here (the period-total
    // LatenessDeductionAmount sum is Phase 5's job, PayrollEntry doesn't
    // exist yet). grace=0 set: 15,0,40,10,0 unchanged. grace=5 set: the
    // same lateness values, each reduced by 5 (floored at 0).
    [Theory]
    [InlineData(0, 15, 15)]
    [InlineData(0, 0, 0)]
    [InlineData(0, 40, 40)]
    [InlineData(0, 10, 10)]
    [InlineData(5, 15, 10)]
    [InlineData(5, 0, 0)]
    [InlineData(5, 40, 35)]
    [InlineData(5, 10, 5)]
    [InlineData(15, 10, 0)] // grace exceeding lateness clamps to 0, not negative
    public async Task LateMinutes_matches_MASTER_8_1_worked_examples(int graceMinutes, int minutesLate, int expectedLateMinutes)
    {
        var (companyId, objectId, brigadirId, workerId) = await SeedAsync(graceMinutes);
        var brigadir = AsBrigadir(companyId, brigadirId);

        await using var context = fixture.CreateDbContext(brigadir);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var checkInAt = new DateTimeOffset(today.Year, today.Month, today.Day, 8, minutesLate, 0, TimeSpan.Zero);

        var result = await new CreateManualTimesheetCommandHandler(context, brigadir)
            .Handle(new CreateManualTimesheetCommand(workerId, objectId, today, checkInAt, null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.LateMinutes.Should().Be(expectedLateMinutes);
    }

    [Fact]
    public async Task LateMinutes_is_null_not_zero_when_ShiftStartTime_unset()
    {
        var (companyId, objectId, brigadirId, workerId) = await SeedAsync(hasShiftStartTime: false);
        var brigadir = AsBrigadir(companyId, brigadirId);

        await using var context = fixture.CreateDbContext(brigadir);
        var result = await new CheckInTimesheetCommandHandler(context, brigadir)
            .Handle(new CheckInTimesheetCommand(workerId, objectId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.LateMinutes.Should().BeNull("no ShiftStartTime means we can't tell if they were late — must not silently read as on-time (0)");
        result.Value.PlannedStartTime.Should().BeNull();
    }

    [Fact]
    public async Task CheckIn_twice_same_day_is_rejected_not_an_exception()
    {
        var (companyId, objectId, brigadirId, workerId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);

        await using var context = fixture.CreateDbContext(brigadir);
        var handler = new CheckInTimesheetCommandHandler(context, brigadir);
        var first = await handler.Handle(new CheckInTimesheetCommand(workerId, objectId), CancellationToken.None);
        first.IsSuccess.Should().BeTrue();

        var second = await handler.Handle(new CheckInTimesheetCommand(workerId, objectId), CancellationToken.None);
        second.IsFailure.Should().BeTrue();
        second.Error.Code.Should().Be("TIMESHEET_ALREADY_CHECKED_IN");
    }

    [Fact]
    public async Task Brigadir_cannot_check_in_a_worker_from_a_different_brigade()
    {
        var (companyId, objectId, brigadirId, _) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);

        await using var seedContext = fixture.CreateDbContext();
        var otherBrigade = Brigade.Create(companyId, "Other Brigade");
        var strangerWorker = Worker.Create(companyId, otherBrigade.Id, "Stranger", "+992000000009",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1), shiftStartTime: new TimeOnly(8, 0));
        seedContext.Brigades.Add(otherBrigade);
        seedContext.Workers.Add(strangerWorker);
        await seedContext.SaveChangesAsync(CancellationToken.None);

        await using var context = fixture.CreateDbContext(brigadir);
        var result = await new CheckInTimesheetCommandHandler(context, brigadir)
            .Handle(new CheckInTimesheetCommand(strangerWorker.Id, objectId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_NOT_FOUND", "cross-brigade access reads as 404, not 403");
    }

    [Fact]
    public async Task CheckOut_computes_HoursWorked()
    {
        var (companyId, objectId, brigadirId, workerId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);

        Guid timesheetId;
        await using (var context = fixture.CreateDbContext(brigadir))
        {
            var checkIn = await new CheckInTimesheetCommandHandler(context, brigadir)
                .Handle(new CheckInTimesheetCommand(workerId, objectId), CancellationToken.None);
            timesheetId = checkIn.Value.Id;
        }

        await using (var context = fixture.CreateDbContext(brigadir))
        {
            var checkOut = await new CheckOutTimesheetCommandHandler(context, brigadir)
                .Handle(new CheckOutTimesheetCommand(timesheetId), CancellationToken.None);
            checkOut.IsSuccess.Should().BeTrue();
            checkOut.Value.HoursWorked.Should().NotBeNull();
            checkOut.Value.HoursWorked.Should().BeGreaterOrEqualTo(0);
        }
    }
}

using Api.BackgroundServices;
using Application.Common.Interfaces;
using Application.Timesheets;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class BusinessTimeAttendanceTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Check_in_uses_Dushanbe_date_and_local_shift_start_at_the_utc_month_boundary()
    {
        var checkInAt = new DateTimeOffset(2026, 7, 31, 19, 10, 0, TimeSpan.Zero);
        var (actor, workerId, objectId, _) = await SeedAsync(new TimeOnly(0, 0));
        var businessTime = new FixedBusinessTimeProvider(checkInAt);

        await using var context = fixture.CreateDbContext(actor);
        var result = await new CheckInCommandHandler(context, actor, businessTime)
            .Handle(new CheckInCommand(workerId, objectId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Date.Should().Be(new DateOnly(2026, 8, 1));
        result.Value.CheckInAt.Should().Be(checkInAt);
        result.Value.CheckInAt!.Value.Offset.Should().Be(TimeSpan.Zero);
        result.Value.LateMinutes.Should().Be(10);
    }

    [Fact]
    public async Task Checkout_across_Dushanbe_midnight_keeps_the_original_attendance_date_and_utc_duration()
    {
        var checkInAt = new DateTimeOffset(2026, 7, 31, 18, 50, 0, TimeSpan.Zero);
        var checkOutAt = new DateTimeOffset(2026, 7, 31, 19, 10, 0, TimeSpan.Zero);
        var (actor, workerId, objectId, _) = await SeedAsync(new TimeOnly(23, 0));

        Guid timesheetId;
        await using (var checkInContext = fixture.CreateDbContext(actor))
        {
            var checkIn = await new CheckInCommandHandler(checkInContext, actor, new FixedBusinessTimeProvider(checkInAt))
                .Handle(new CheckInCommand(workerId, objectId), CancellationToken.None);
            checkIn.IsSuccess.Should().BeTrue();
            checkIn.Value.Date.Should().Be(new DateOnly(2026, 7, 31));
            timesheetId = checkIn.Value.Id;
        }

        await using var checkOutContext = fixture.CreateDbContext(actor);
        var checkOut = await new CheckOutCommandHandler(checkOutContext, actor, new FixedBusinessTimeProvider(checkOutAt))
            .Handle(new CheckOutCommand(timesheetId), CancellationToken.None);

        checkOut.IsSuccess.Should().BeTrue();
        checkOut.Value.Date.Should().Be(new DateOnly(2026, 7, 31));
        checkOut.Value.CheckOutAt.Should().Be(checkOutAt);
        checkOut.Value.HoursWorked.Should().BeApproximately(1m / 3m, 0.0001m);
    }

    [Fact]
    public async Task Overdue_check_uses_the_Dushanbe_business_day_for_due_instants()
    {
        var now = new DateTimeOffset(2026, 8, 1, 19, 10, 0, TimeSpan.Zero); // 2026-08-02 00:10 in Dushanbe
        var businessTime = new FixedBusinessTimeProvider(now);
        var (actor, workerId, _, brigadeId) = await SeedAsync(new TimeOnly(8, 0));
        var dueAt = new DateTimeOffset(2026, 7, 31, 19, 30, 0, TimeSpan.Zero); // 2026-08-01 in Dushanbe
        var task = IndividualTask.Create(
            actor.CompanyId!.Value,
            "TIME-OVERDUE",
            brigadeId,
            workerId,
            "Business-time overdue task",
            actor.UserId!.Value,
            dueAt: dueAt);
        var notifier = new RecordingOverdueNotifier();

        await using var context = fixture.CreateDbContext(actor);
        context.IndividualTasks.Add(task);
        await context.SaveChangesAsync(CancellationToken.None);

        await OverdueCheckBackgroundService.CheckCompanyAsync(
            context,
            notifier,
            actor.CompanyId.Value,
            businessTime.Today.AddDays(-1),
            businessTime,
            CancellationToken.None);

        notifier.OverdueIndividualTaskIds.Should().ContainSingle().Which.Should().Be(task.Id);
    }

    private async Task<(FixedCurrentUserService Actor, Guid WorkerId, Guid ObjectId, Guid BrigadeId)> SeedAsync(TimeOnly shiftStartTime)
    {
        var companyId = Guid.NewGuid();
        var company = Company.Create(companyId, $"Business Time Co {companyId}");
        var customer = Customer.Create(companyId, "Customer");
        var constructionObject = ConstructionObject.Create(companyId, "Object", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade");
        var brigadir = User.Create(companyId, "Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var worker = Worker.Create(
            companyId, brigade.Id, "Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1),
            userId: brigadir.Id, shiftStartTime: shiftStartTime);

        await using (var context = fixture.CreateDbContext())
        {
            context.Companies.Add(company);
            context.Customers.Add(customer);
            context.ConstructionObjects.Add(constructionObject);
            context.Brigades.Add(brigade);
            context.Users.Add(brigadir);
            context.Workers.Add(worker);
            await context.SaveChangesAsync(CancellationToken.None);
        }

        return (new FixedCurrentUserService(companyId, brigadir.Id, Role.Brigadir), worker.Id, constructionObject.Id, brigade.Id);
    }

    private sealed class RecordingOverdueNotifier : IOverdueNotifier
    {
        public List<Guid> OverdueIndividualTaskIds { get; } = [];

        public Task NotifyWorkOrderOverdueAsync(
            Guid companyId,
            Guid workOrderId,
            Guid brigadeId,
            DateOnly dueDate,
            CancellationToken cancellationToken) => Task.CompletedTask;

        public Task NotifyIndividualTaskOverdueAsync(
            Guid companyId,
            Guid taskId,
            Guid brigadeId,
            DateTimeOffset dueAt,
            CancellationToken cancellationToken)
        {
            OverdueIndividualTaskIds.Add(taskId);
            return Task.CompletedTask;
        }
    }
}

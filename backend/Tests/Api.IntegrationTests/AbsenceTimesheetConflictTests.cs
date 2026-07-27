using Application.Absences;
using Application.Timesheets;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §8.9: "Пересечение с Timesheet (человек отмечен И в отпуске) —
// конфликт, 400: либо отметка ошибочна, либо отсутствие. Не угадывать."
// Real Postgres via PostgresFixture — permanent coverage for both
// directions of the guard added in Phase 3 Steps 1/2 (CheckInCommand /
// CreateAbsenceRecordCommand), plus the non-conflicting case.
[Collection(PostgresCollection.Name)]
public sealed class AbsenceTimesheetConflictTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid ProrabUserId, Guid BrigadirUserId, Guid WorkerId, Guid ObjectId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"Absence Conflict Test Co {companyId}");
        var customer = Customer.Create(companyId, "Acme");
        var constructionObject = ConstructionObject.Create(companyId, "Object A", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade A");
        var prorabUser = User.Create("Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var worker = Worker.Create(
            companyId, brigade.Id, "Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1),
            userId: brigadirUser.Id, shiftStartTime: new TimeOnly(8, 0));

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(constructionObject);
        context.Brigades.Add(brigade);
        context.Users.AddRange(prorabUser, brigadirUser);
        context.Workers.Add(worker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner, prorabUser.Id, brigadirUser.Id, worker.Id, constructionObject.Id);
    }

    [Fact]
    public async Task Filing_an_absence_over_an_existing_check_in_is_rejected()
    {
        var (owner, prorabUserId, brigadirUserId, workerId, objectId) = await SeedAsync();
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await using (var checkInContext = fixture.CreateDbContext(brigadir))
        {
            var checkIn = await new CheckInCommandHandler(checkInContext, brigadir)
                .Handle(new CheckInCommand(workerId, objectId), CancellationToken.None);
            checkIn.IsSuccess.Should().BeTrue();
        }

        await using var context = fixture.CreateDbContext(prorab);
        var result = await new CreateAbsenceRecordCommandHandler(context, prorab, new NotUsedFileStorageService()).Handle(
            new CreateAbsenceRecordCommand(workerId, today, today, AbsenceType.SickLeave, true, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("TIMESHEET_ABSENCE_CONFLICT");
    }

    [Fact]
    public async Task Checking_in_during_a_filed_absence_is_rejected()
    {
        var (owner, prorabUserId, brigadirUserId, workerId, objectId) = await SeedAsync();
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        await using (var absenceContext = fixture.CreateDbContext(prorab))
        {
            var absence = await new CreateAbsenceRecordCommandHandler(absenceContext, prorab, new NotUsedFileStorageService()).Handle(
                new CreateAbsenceRecordCommand(workerId, today, today, AbsenceType.Vacation, true, null, null),
                CancellationToken.None);
            absence.IsSuccess.Should().BeTrue();
        }

        await using var context = fixture.CreateDbContext(brigadir);
        var result = await new CheckInCommandHandler(context, brigadir)
            .Handle(new CheckInCommand(workerId, objectId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("TIMESHEET_ABSENCE_CONFLICT");
    }

    [Fact]
    public async Task Non_overlapping_absence_and_check_in_both_succeed()
    {
        var (owner, prorabUserId, brigadirUserId, workerId, objectId) = await SeedAsync();
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        var future = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(10);
        await using (var absenceContext = fixture.CreateDbContext(prorab))
        {
            var absence = await new CreateAbsenceRecordCommandHandler(absenceContext, prorab, new NotUsedFileStorageService()).Handle(
                new CreateAbsenceRecordCommand(workerId, future, future.AddDays(3), AbsenceType.Vacation, true, null, null),
                CancellationToken.None);
            absence.IsSuccess.Should().BeTrue();
            absence.Value.ApprovedByUserId.Should().Be(prorabUserId);
        }

        await using var context = fixture.CreateDbContext(brigadir);
        var checkIn = await new CheckInCommandHandler(context, brigadir)
            .Handle(new CheckInCommand(workerId, objectId), CancellationToken.None);

        checkIn.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task IsPaid_absence_is_recorded_as_such_and_unpaid_leave_is_distinguishable()
    {
        var (owner, prorabUserId, _, workerId, _) = await SeedAsync();
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);
        var from = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(20);

        await using var context = fixture.CreateDbContext(prorab);
        var paid = await new CreateAbsenceRecordCommandHandler(context, prorab, new NotUsedFileStorageService()).Handle(
            new CreateAbsenceRecordCommand(workerId, from, from, AbsenceType.SickLeave, true, "flu", null),
            CancellationToken.None);
        var unpaid = await new CreateAbsenceRecordCommandHandler(context, prorab, new NotUsedFileStorageService()).Handle(
            new CreateAbsenceRecordCommand(workerId, from.AddDays(1), from.AddDays(1), AbsenceType.Unpaid, false, null, null),
            CancellationToken.None);

        paid.IsSuccess.Should().BeTrue();
        paid.Value.IsPaid.Should().BeTrue();
        unpaid.IsSuccess.Should().BeTrue();
        unpaid.Value.IsPaid.Should().BeFalse();
    }
}

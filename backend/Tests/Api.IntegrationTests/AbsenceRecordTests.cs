using System.Text;
using Application.AbsenceRecords;
using Application.Common.Interfaces;
using Application.Timesheets;
using Application.WorkOrders;
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

file sealed class NoOpPhotoStorageService : IPhotoStorageService
{
    public string? LastSavedKey { get; private set; }
    public long MaxFileSizeBytes => 10 * 1024 * 1024;
    public bool IsAllowedContentType(string contentType) => contentType is "image/jpeg" or "image/png" or "image/webp";

    public Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken)
    {
        LastSavedKey = Guid.NewGuid().ToString();
        return Task.FromResult(LastSavedKey);
    }

    public string GenerateSignedDownloadUrl(string storageKey) => $"signed:{storageKey}";
    public bool ValidateSignature(string storageKey, long expiresAtUnixSeconds, string signature) => true;
    public Stream OpenRead(string storageKey) => throw new NotImplementedException();
}

// MASTER §5.21, §8.9: "отсутствие вместо прогула" — the conflict guard
// that keeps a day from being both "checked in" and "on approved leave" at
// once, in both directions. Phase 3 Step 7 — promotes Step 2's throwaway
// checks into permanent coverage.
[Collection(PostgresCollection.Name)]
public sealed class AbsenceRecordTests(PostgresFixture fixture)
{
    private async Task<(Guid CompanyId, Guid ObjectId, Guid BrigadirId, Guid WorkerId, Guid ProrabId)> SeedAsync()
    {
        await using var context = fixture.CreateDbContext();
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var prorabUser = User.Create("Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var worker = Worker.Create(company.Id, brigade.Id, "Worker", "+992000000001",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1),
            userId: brigadirUser.Id, shiftStartTime: new TimeOnly(8, 0));

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(obj);
        context.Brigades.Add(brigade);
        context.Users.AddRange(brigadirUser, prorabUser);
        context.Workers.Add(worker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (company.Id, obj.Id, brigadirUser.Id, worker.Id, prorabUser.Id);
    }

    private static ICurrentUserService AsBrigadir(Guid companyId, Guid brigadirId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = brigadirId, Role = Role.Brigadir };

    private static ICurrentUserService AsProrab(Guid companyId, Guid prorabId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = prorabId, Role = Role.Prorab };

    [Fact]
    public async Task Create_succeeds_and_auto_approves()
    {
        var (companyId, _, _, workerId, prorabId) = await SeedAsync();
        var prorab = AsProrab(companyId, prorabId);

        await using var context = fixture.CreateDbContext(prorab);
        var handler = new CreateAbsenceRecordCommandHandler(context, prorab, new NoOpPhotoStorageService());

        var result = await handler.Handle(
            new CreateAbsenceRecordCommand(workerId, new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 3), AbsenceType.SickLeave, true, "Простуда", null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.IsPaid.Should().BeTrue();
        result.Value.ApprovedByUserId.Should().Be(prorabId, "creation IS the decision — no separate approve step");
    }

    [Fact]
    public async Task Create_rejects_when_a_Timesheet_already_exists_in_the_range()
    {
        var (companyId, objectId, brigadirId, workerId, prorabId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);
        var prorab = AsProrab(companyId, prorabId);

        await using (var context = fixture.CreateDbContext(brigadir))
            await new CheckInTimesheetCommandHandler(context, brigadir)
                .Handle(new CheckInTimesheetCommand(workerId, objectId), CancellationToken.None);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await using var prorabContext = fixture.CreateDbContext(prorab);
        var result = await new CreateAbsenceRecordCommandHandler(prorabContext, prorab, new NoOpPhotoStorageService())
            .Handle(new CreateAbsenceRecordCommand(workerId, today, today, AbsenceType.Vacation, true, null, null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("TIMESHEET_ABSENCE_CONFLICT");
    }

    [Fact]
    public async Task CheckIn_rejects_when_an_AbsenceRecord_already_covers_today()
    {
        var (companyId, objectId, brigadirId, workerId, prorabId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);
        var prorab = AsProrab(companyId, prorabId);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        await using (var context = fixture.CreateDbContext(prorab))
        {
            var create = await new CreateAbsenceRecordCommandHandler(context, prorab, new NoOpPhotoStorageService())
                .Handle(new CreateAbsenceRecordCommand(workerId, today, today.AddDays(2), AbsenceType.SickLeave, true, null, null), CancellationToken.None);
            create.IsSuccess.Should().BeTrue();
        }

        await using var brigadirContext = fixture.CreateDbContext(brigadir);
        var checkIn = await new CheckInTimesheetCommandHandler(brigadirContext, brigadir)
            .Handle(new CheckInTimesheetCommand(workerId, objectId), CancellationToken.None);

        checkIn.IsFailure.Should().BeTrue();
        checkIn.Error.Code.Should().Be("TIMESHEET_ABSENCE_CONFLICT", "the reverse direction of the same conflict must also be caught, per §8.9 'не угадывать'");
    }

    [Fact]
    public async Task Document_upload_is_stored_as_a_key_and_read_back_as_a_signed_url()
    {
        var (companyId, _, _, workerId, prorabId) = await SeedAsync();
        var prorab = AsProrab(companyId, prorabId);
        var photoStorage = new NoOpPhotoStorageService();

        await using var context = fixture.CreateDbContext(prorab);
        var content = new MemoryStream(Encoding.UTF8.GetBytes("fake jpeg bytes"));
        var document = new PhotoUpload(content, "image/jpeg", content.Length);

        var result = await new CreateAbsenceRecordCommandHandler(context, prorab, photoStorage)
            .Handle(new CreateAbsenceRecordCommand(workerId, new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 1), AbsenceType.SickLeave, true, null, document),
                CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.DocumentUrl.Should().Be("signed:" + photoStorage.LastSavedKey);
    }

    [Fact]
    public void Reason_over_max_length_fails_validation()
    {
        new CreateAbsenceRecordCommandValidator()
            .Validate(new CreateAbsenceRecordCommand(Guid.NewGuid(), new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 1),
                AbsenceType.Other, true, new string('x', 1001), null))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public void DateTo_before_DateFrom_fails_validation()
    {
        new CreateAbsenceRecordCommandValidator()
            .Validate(new CreateAbsenceRecordCommand(Guid.NewGuid(), new DateOnly(2026, 8, 5), new DateOnly(2026, 8, 1),
                AbsenceType.Other, true, null, null))
            .IsValid.Should().BeFalse();
    }
}

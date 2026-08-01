using Application.Common.Interfaces;
using Application.Common.Options;
using Application.WorkOrders;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.Extensions.Options;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class WorkOrderProgressUploadTests(PostgresFixture fixture)
{
    private static readonly FileStorageOptions UploadOptions = new()
    {
        MaxFileSizeBytes = 10,
        MaxTotalUploadSizeBytes = 15,
        MaxPhotosPerProgress = 2,
        AllowedContentTypes = ["image/jpeg"]
    };

    private async Task<(FixedCurrentUserService Brigadir, Guid WorkOrderId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var company = Company.Create(companyId, $"Upload Test Co {companyId}");
        var customer = Customer.Create(companyId, "Customer");
        var constructionObject = ConstructionObject.Create(companyId, "Object", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade");
        brigade.AssignBrigadir(brigadirUser.Id);
        var worker = Worker.Create(companyId, brigade.Id, "Brigadir Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1), brigadirUser.Id);
        var order = WorkOrder.Create(companyId, "BR-UPLOAD", constructionObject.Id, brigade.Id, "Order", "m2", 10m, 10m, owner.UserId!.Value);
        order.Assign(DateOnly.FromDateTime(DateTime.UtcNow));
        order.Start();

        await using var context = fixture.CreateDbContext(owner);
        context.AddRange(company, customer, constructionObject, brigade, brigadirUser, worker, order);
        await context.SaveChangesAsync(CancellationToken.None);

        return (new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir), order.Id);
    }

    [Fact]
    public async Task Valid_upload_is_persisted_after_actual_stream_validation()
    {
        var (brigadir, workOrderId) = await SeedAsync();
        var storage = new RecordingFileStorage();
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await Handler(context, brigadir, storage).Handle(
            new AddWorkOrderProgressCommand(workOrderId, 1m, null, [Photo(new byte[] { 1, 2, 3 }, declaredLength: 3)]), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        storage.Saved.Should().ContainSingle().Which.Should().Equal(1, 2, 3);
    }

    [Fact]
    public async Task Too_many_files_are_rejected_without_storing_any_file()
    {
        var (brigadir, workOrderId) = await SeedAsync();
        var storage = new RecordingFileStorage();
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await Handler(context, brigadir, storage).Handle(
            new AddWorkOrderProgressCommand(workOrderId, 1m, null, [Photo([1]), Photo([2]), Photo([3])]), CancellationToken.None);

        result.Error.Code.Should().Be("VALIDATION_FAILED");
        storage.Saved.Should().BeEmpty();
    }

    [Fact]
    public async Task Aggregate_size_over_limit_is_rejected_without_storing_any_file()
    {
        var (brigadir, workOrderId) = await SeedAsync();
        var storage = new RecordingFileStorage();
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await Handler(context, brigadir, storage).Handle(
            new AddWorkOrderProgressCommand(workOrderId, 1m, null, [Photo(new byte[10]), Photo(new byte[6])]), CancellationToken.None);

        result.Error.Code.Should().Be("VALIDATION_FAILED");
        storage.Saved.Should().BeEmpty();
    }

    [Fact]
    public async Task Individual_file_over_limit_is_rejected_without_storing_any_file()
    {
        var (brigadir, workOrderId) = await SeedAsync();
        var storage = new RecordingFileStorage();
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await Handler(context, brigadir, storage).Handle(
            new AddWorkOrderProgressCommand(workOrderId, 1m, null, [Photo(new byte[11])]), CancellationToken.None);

        result.Error.Code.Should().Be("VALIDATION_FAILED");
        storage.Saved.Should().BeEmpty();
    }

    [Fact]
    public async Task Stream_larger_than_declared_length_is_rejected_without_storing_any_file()
    {
        var (brigadir, workOrderId) = await SeedAsync();
        var storage = new RecordingFileStorage();
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await Handler(context, brigadir, storage).Handle(
            new AddWorkOrderProgressCommand(workOrderId, 1m, null, [Photo(new byte[11], declaredLength: 1)]), CancellationToken.None);

        result.Error.Code.Should().Be("VALIDATION_FAILED");
        storage.Saved.Should().BeEmpty();
    }

    private static AddWorkOrderProgressCommandHandler Handler(
        Infrastructure.Persistence.ApplicationDbContext context,
        FixedCurrentUserService brigadir,
        RecordingFileStorage storage) => new(context, brigadir, storage, Options.Create(UploadOptions));

    private static WorkOrderProgressPhoto Photo(byte[] bytes, long? declaredLength = null) =>
        new(new MemoryStream(bytes), "image/jpeg", declaredLength ?? bytes.LongLength);

    private sealed class RecordingFileStorage : IFileStorageService
    {
        public List<byte[]> Saved { get; } = [];

        public async Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken)
        {
            using var buffer = new MemoryStream();
            await content.CopyToAsync(buffer, cancellationToken);
            Saved.Add(buffer.ToArray());
            return $"photo-{Saved.Count}.jpg";
        }

        public string GetSignedUrl(string key) => key;
        public bool TryValidateSignedUrl(string key, long expiresAtUnixSeconds, string signature) => false;
        public Task<(Stream Content, string ContentType)> OpenReadAsync(string key, CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}

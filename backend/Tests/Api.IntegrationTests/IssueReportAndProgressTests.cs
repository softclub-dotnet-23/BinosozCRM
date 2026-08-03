using Application.Common.Interfaces;
using Application.Common.Options;
using Application.IssueReports;
using Application.WorkOrders;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.IntegrationTests;

// Worker-dashboard checkpoint (docs/PROGRESS.md): isolation coverage for the
// new IssueReport entity (own-vs-other-worker, Prorab object scoping) and
// ListMyWorkOrderProgressQuery (own-vs-other-worker), mirroring the shape of
// BrigadirAccessTests/MaterialDeliveryAuthorizationTests.
[Collection(PostgresCollection.Name)]
public sealed class IssueReportAndProgressTests(PostgresFixture fixture)
{
    private static readonly IOptions<FileStorageOptions> DefaultFileStorageOptions = Options.Create(new FileStorageOptions());

    private sealed class NullFileStorage : IFileStorageService
    {
        public Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken) => Task.FromResult("unused.jpg");
        public string GetSignedUrl(string key) => key;
        public bool TryValidateSignedUrl(string key, long expiresAtUnixSeconds, string signature) => false;
        public Task<(Stream Content, string ContentType)> OpenReadAsync(string key, CancellationToken cancellationToken) => throw new NotSupportedException();
    }

    private async Task<(FixedCurrentUserService Owner, FixedCurrentUserService WorkerA, FixedCurrentUserService WorkerB, FixedCurrentUserService AssignedProrab, FixedCurrentUserService UnassignedProrab, Guid ObjectId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        var workerAUser = User.Create(companyId, "Worker A", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Worker);
        var workerBUser = User.Create(companyId, "Worker B", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Worker);
        var assignedProrabUser = User.Create(companyId, "Assigned Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var unassignedProrabUser = User.Create(companyId, "Unassigned Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var company = Company.Create(companyId, $"Issue Report Co {companyId}");
        var customer = Customer.Create(companyId, "Customer");
        var constructionObject = ConstructionObject.Create(companyId, "Object A", customer.Id);
        var otherObject = ConstructionObject.Create(companyId, "Object B", customer.Id);
        var brigadeA = Brigade.Create(companyId, "Brigade A");
        var brigadeB = Brigade.Create(companyId, "Brigade B");
        var workerA = Worker.Create(companyId, brigadeA.Id, "Worker A", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1), workerAUser.Id);
        var workerB = Worker.Create(companyId, brigadeB.Id, "Worker B", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1), workerBUser.Id);

        await using var context = fixture.CreateDbContext(owner);
        // MASTER §1.2: no ProrabObjectAssignment rows at all means "sees
        // everything" — to actually test the exclusion path, the second
        // Prorab needs a *different* single-object allow-list, not zero rows.
        context.AddRange(company, customer, constructionObject, otherObject, brigadeA, brigadeB, workerAUser, workerBUser, assignedProrabUser, unassignedProrabUser, workerA, workerB,
            ProrabObjectAssignment.Create(companyId, assignedProrabUser.Id, constructionObject.Id, DateTimeOffset.UtcNow, owner.UserId!.Value),
            ProrabObjectAssignment.Create(companyId, unassignedProrabUser.Id, otherObject.Id, DateTimeOffset.UtcNow, owner.UserId!.Value));
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner,
            new FixedCurrentUserService(companyId, workerAUser.Id, Role.Worker),
            new FixedCurrentUserService(companyId, workerBUser.Id, Role.Worker),
            new FixedCurrentUserService(companyId, assignedProrabUser.Id, Role.Prorab),
            new FixedCurrentUserService(companyId, unassignedProrabUser.Id, Role.Prorab),
            constructionObject.Id);
    }

    [Fact]
    public async Task Worker_creates_issue_report_and_sees_it_in_own_list()
    {
        var (_, workerA, _, _, _, objectId) = await SeedAsync();
        await using var context = fixture.CreateDbContext(workerA);

        var createResult = await new CreateIssueReportCommandHandler(context, workerA, new NullFileStorage(), DefaultFileStorageOptions)
            .Handle(new CreateIssueReportCommand(objectId, "Leaking pipe", "Water leaking near entrance", null, null), CancellationToken.None);

        createResult.IsSuccess.Should().BeTrue();

        var listResult = await new ListIssueReportsQueryHandler(context, workerA, new NullFileStorage())
            .Handle(new ListIssueReportsQuery(1, 20), CancellationToken.None);

        listResult.IsSuccess.Should().BeTrue();
        listResult.Value.Items.Should().ContainSingle(r => r.Title == "Leaking pipe");
    }

    [Fact]
    public async Task Worker_does_not_see_another_workers_issue_report()
    {
        var (_, workerA, workerB, _, _, objectId) = await SeedAsync();
        await using var contextA = fixture.CreateDbContext(workerA);
        await new CreateIssueReportCommandHandler(contextA, workerA, new NullFileStorage(), DefaultFileStorageOptions)
            .Handle(new CreateIssueReportCommand(objectId, "Worker A's problem", "Description", null, null), CancellationToken.None);

        await using var contextB = fixture.CreateDbContext(workerB);
        var listResult = await new ListIssueReportsQueryHandler(contextB, workerB, new NullFileStorage())
            .Handle(new ListIssueReportsQuery(1, 20), CancellationToken.None);

        listResult.IsSuccess.Should().BeTrue();
        listResult.Value.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task Assigned_prorab_sees_the_report_but_unassigned_prorab_cannot_resolve_it()
    {
        var (_, workerA, _, assignedProrab, unassignedProrab, objectId) = await SeedAsync();
        await using var createContext = fixture.CreateDbContext(workerA);
        var created = await new CreateIssueReportCommandHandler(createContext, workerA, new NullFileStorage(), DefaultFileStorageOptions)
            .Handle(new CreateIssueReportCommand(objectId, "Scaffolding issue", "Description", null, null), CancellationToken.None);
        created.IsSuccess.Should().BeTrue();

        await using var assignedContext = fixture.CreateDbContext(assignedProrab);
        var listResult = await new ListIssueReportsQueryHandler(assignedContext, assignedProrab, new NullFileStorage())
            .Handle(new ListIssueReportsQuery(1, 20), CancellationToken.None);
        listResult.Value.Items.Should().ContainSingle(r => r.Title == "Scaffolding issue");

        await using var unassignedContext = fixture.CreateDbContext(unassignedProrab);
        var resolveResult = await new ResolveIssueReportCommandHandler(unassignedContext, unassignedProrab, new NullFileStorage())
            .Handle(new ResolveIssueReportCommand(created.Value.Id), CancellationToken.None);

        resolveResult.IsFailure.Should().BeTrue();
        resolveResult.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
    }

    [Fact]
    public async Task Assigned_prorab_resolves_report_and_a_second_resolve_is_rejected()
    {
        var (_, workerA, _, assignedProrab, _, objectId) = await SeedAsync();
        await using var createContext = fixture.CreateDbContext(workerA);
        var created = await new CreateIssueReportCommandHandler(createContext, workerA, new NullFileStorage(), DefaultFileStorageOptions)
            .Handle(new CreateIssueReportCommand(objectId, "Missing guardrail", "Description", null, null), CancellationToken.None);

        await using var context = fixture.CreateDbContext(assignedProrab);
        var handler = new ResolveIssueReportCommandHandler(context, assignedProrab, new NullFileStorage());

        var firstResolve = await handler.Handle(new ResolveIssueReportCommand(created.Value.Id), CancellationToken.None);
        firstResolve.IsSuccess.Should().BeTrue();
        firstResolve.Value.Status.Should().Be(IssueReportStatus.Resolved);

        var secondResolve = await handler.Handle(new ResolveIssueReportCommand(created.Value.Id), CancellationToken.None);
        secondResolve.IsFailure.Should().BeTrue();
        secondResolve.Error.Code.Should().Be("ISSUE_REPORT_INVALID_TRANSITION");
    }

    [Fact]
    public async Task Worker_sees_only_their_own_submitted_progress_reports()
    {
        var (owner, workerA, workerB, _, _, objectId) = await SeedAsync();

        await using var setupContext = fixture.CreateDbContext(owner);
        var brigadeAId = await setupContext.Workers.Where(w => w.UserId == workerA.UserId).Select(w => w.BrigadeId).SingleAsync();
        var brigadeBId = await setupContext.Workers.Where(w => w.UserId == workerB.UserId).Select(w => w.BrigadeId).SingleAsync();

        var orderA = WorkOrder.Create(owner.CompanyId!.Value, "BR-A", objectId, brigadeAId, "Order A", "m2", 10m, 10m, owner.UserId!.Value);
        var orderB = WorkOrder.Create(owner.CompanyId!.Value, "BR-B", objectId, brigadeBId, "Order B", "m2", 10m, 10m, owner.UserId!.Value);
        setupContext.AddRange(orderA, orderB);
        await setupContext.SaveChangesAsync(CancellationToken.None);

        var progressA = WorkOrderProgress.Create(owner.CompanyId!.Value, orderA.Id, workerA.UserId!.Value, 5m, DateTimeOffset.UtcNow);
        var progressB = WorkOrderProgress.Create(owner.CompanyId!.Value, orderB.Id, workerB.UserId!.Value, 5m, DateTimeOffset.UtcNow);
        await using (var progressContext = fixture.CreateDbContext(owner))
        {
            progressContext.AddRange(progressA, progressB);
            await progressContext.SaveChangesAsync(CancellationToken.None);
        }

        await using var context = fixture.CreateDbContext(workerA);
        var result = await new ListMyWorkOrderProgressQueryHandler(context, workerA, new NullFileStorage())
            .Handle(new ListMyWorkOrderProgressQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().ContainSingle(p => p.Id == progressA.Id);
    }
}

using Application.Common.Interfaces;
using Application.WorkOrders;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

file sealed class TestCurrentUserService : ICurrentUserService
{
    public Guid? UserId { get; set; }
    public Guid? CompanyId { get; set; }
    public Role? Role { get; set; }
}

// MASTER §7.1 (WorkOrder state machine), §1.2/§11.5 (Prorab-object /
// Brigadir-own-brigade isolation). Phase 2 Step 9's BE half — the
// idempotency-of-the-bot half stays deferred alongside Steps 6-8
// (PROGRESS.md), same split Phase 1 Step 7 used.
[Collection(PostgresCollection.Name)]
public sealed class WorkOrderStateMachineTests(PostgresFixture fixture)
{
    private static readonly NoOpRealtimeNotifier Notifier = new();

    private async Task<(Guid CompanyId, Guid BrigadeId, Guid OtherBrigadeId, Guid ObjectId, Guid OwnerId, Guid BrigadirId)> SeedAsync()
    {
        await using var context = fixture.CreateDbContext();
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var otherBrigade = Brigade.Create(company.Id, "Other Brigade");
        // Role.Prorab in the DB, not Role.Owner — SeedDataServiceTests shares
        // this Postgres container/database and gates its own seeding on "any
        // Owner exists?"; a real Owner row here would trip that global gate.
        // TestCurrentUserService.Role below (not this DB row) is what
        // actually drives handler authorization — WorkOrder handlers trust
        // ICurrentUserService.Role, they never re-check the Users table.
        var owner = User.Create("Owner", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var brigadirWorker = Worker.Create(company.Id, brigade.Id, "Brigadir Worker", "+992000000001",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 100m, new DateOnly(2020, 1, 1), userId: brigadirUser.Id);

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(obj);
        context.Brigades.AddRange(brigade, otherBrigade);
        context.Users.AddRange(owner, brigadirUser);
        context.Workers.Add(brigadirWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (company.Id, brigade.Id, otherBrigade.Id, obj.Id, owner.Id, brigadirUser.Id);
    }

    private static ICurrentUserService AsOwner(Guid companyId, Guid ownerId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = ownerId, Role = Role.Owner };

    private static ICurrentUserService AsBrigadir(Guid companyId, Guid brigadirId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = brigadirId, Role = Role.Brigadir };

    private async Task<Guid> CreateAsync(ICurrentUserService owner, Guid objectId, Guid brigadeId)
    {
        await using var context = fixture.CreateDbContext(owner);
        var create = await new CreateWorkOrderCommandHandler(context, owner)
            .Handle(new CreateWorkOrderCommand(objectId, brigadeId, "Order", "m2", 10m, 100m, null, null), CancellationToken.None);
        return create.Value.Id;
    }

    private async Task AddProgressAsync(Guid companyId, Guid workOrderId, Guid brigadirId)
    {
        await using var context = fixture.CreateDbContext();
        context.WorkOrderProgresses.Add(WorkOrderProgress.Create(companyId, workOrderId, brigadirId, 5m, DateTimeOffset.UtcNow));
        await context.SaveChangesAsync(CancellationToken.None);
    }

    [Fact]
    public async Task Full_happy_path_reaches_Closed_through_every_allowed_transition()
    {
        var (companyId, brigadeId, _, objectId, ownerId, brigadirId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);
        var brigadir = AsBrigadir(companyId, brigadirId);
        var workOrderId = await CreateAsync(owner, objectId, brigadeId);

        await using (var context = fixture.CreateDbContext(owner))
        {
            var assign = await new AssignWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
            assign.IsSuccess.Should().BeTrue();
            assign.Value.Status.Should().Be(WorkOrderStatus.Assigned);
        }

        await using (var context = fixture.CreateDbContext(owner))
        {
            var start = await new StartWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None);
            start.IsSuccess.Should().BeTrue();
            start.Value.Status.Should().Be(WorkOrderStatus.InProgress);
        }

        await AddProgressAsync(companyId, workOrderId, brigadirId);

        await using (var context = fixture.CreateDbContext(brigadir))
        {
            var submit = await new SubmitWorkOrderForReviewCommandHandler(context, brigadir, Notifier)
                .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None);
            submit.IsSuccess.Should().BeTrue();
            submit.Value.Status.Should().Be(WorkOrderStatus.OnReview);
        }

        await using (var context = fixture.CreateDbContext(owner))
        {
            var accept = await new AcceptWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new AcceptWorkOrderCommand(workOrderId), CancellationToken.None);
            accept.IsSuccess.Should().BeTrue();
            accept.Value.Status.Should().Be(WorkOrderStatus.Accepted);
        }

        await using (var context = fixture.CreateDbContext(owner))
        {
            var close = await new CloseWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new CloseWorkOrderCommand(workOrderId), CancellationToken.None);
            close.IsSuccess.Should().BeTrue();
            close.Value.Status.Should().Be(WorkOrderStatus.Closed);
        }

        await using var verifyContext = fixture.CreateDbContext(owner);
        var logs = await verifyContext.TaskLogs
            .Where(l => l.EntityId == workOrderId && l.EntityType == TaskLogEntityType.WorkOrder)
            .OrderBy(l => l.ChangedAt)
            .ToListAsync(CancellationToken.None);
        logs.Select(l => l.ToStatus).Should().ContainInOrder(
            nameof(WorkOrderStatus.Assigned), nameof(WorkOrderStatus.InProgress), nameof(WorkOrderStatus.OnReview),
            nameof(WorkOrderStatus.Accepted), nameof(WorkOrderStatus.Closed));
    }

    [Fact]
    public async Task Reject_then_rework_returns_to_InProgress_and_can_be_resubmitted()
    {
        var (companyId, brigadeId, _, objectId, ownerId, brigadirId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);
        var brigadir = AsBrigadir(companyId, brigadirId);
        var workOrderId = await CreateAsync(owner, objectId, brigadeId);

        await using (var context = fixture.CreateDbContext(owner))
        {
            await new AssignWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
            await new StartWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None);
        }

        await AddProgressAsync(companyId, workOrderId, brigadirId);

        await using (var context = fixture.CreateDbContext(brigadir))
            await new SubmitWorkOrderForReviewCommandHandler(context, brigadir, Notifier)
                .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None);

        await using (var context = fixture.CreateDbContext(owner))
        {
            var reject = await new RejectWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new RejectWorkOrderCommand(workOrderId, "Не хватает материала"), CancellationToken.None);
            reject.IsSuccess.Should().BeTrue();
            reject.Value.Status.Should().Be(WorkOrderStatus.Rejected);
        }

        await using (var context = fixture.CreateDbContext(brigadir))
        {
            var rework = await new ReworkWorkOrderCommandHandler(context, brigadir, Notifier)
                .Handle(new ReworkWorkOrderCommand(workOrderId), CancellationToken.None);
            rework.IsSuccess.Should().BeTrue();
            rework.Value.Status.Should().Be(WorkOrderStatus.InProgress);
        }

        await using (var context = fixture.CreateDbContext(brigadir))
        {
            var resubmit = await new SubmitWorkOrderForReviewCommandHandler(context, brigadir, Notifier)
                .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None);
            resubmit.IsSuccess.Should().BeTrue();
            resubmit.Value.Status.Should().Be(WorkOrderStatus.OnReview);
        }
    }

    [Theory]
    [InlineData("start")]
    [InlineData("submit")]
    [InlineData("accept")]
    [InlineData("reject")]
    [InlineData("close")]
    [InlineData("rework")]
    public async Task Every_transition_is_rejected_from_the_wrong_starting_status_not_an_exception(string action)
    {
        var (companyId, brigadeId, _, objectId, ownerId, brigadirId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);
        var brigadir = AsBrigadir(companyId, brigadirId);
        // Freshly created -> status "New". None of these six actions are valid from "New".
        var workOrderId = await CreateAsync(owner, objectId, brigadeId);

        await using var context = fixture.CreateDbContext(owner);
        await using var brigadirContext = fixture.CreateDbContext(brigadir);

        var result = action switch
        {
            "start" => await new StartWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None),
            "submit" => await new SubmitWorkOrderForReviewCommandHandler(brigadirContext, brigadir, Notifier)
                .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None),
            "accept" => await new AcceptWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new AcceptWorkOrderCommand(workOrderId), CancellationToken.None),
            "reject" => await new RejectWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new RejectWorkOrderCommand(workOrderId, "reason"), CancellationToken.None),
            "close" => await new CloseWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new CloseWorkOrderCommand(workOrderId), CancellationToken.None),
            "rework" => await new ReworkWorkOrderCommandHandler(brigadirContext, brigadir, Notifier)
                .Handle(new ReworkWorkOrderCommand(workOrderId), CancellationToken.None),
            _ => throw new ArgumentOutOfRangeException(nameof(action))
        };

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().BeOneOf("WORK_ORDER_INVALID_TRANSITION", "WORK_ORDER_NOT_FOUND");
    }

    [Fact]
    public async Task Submit_without_any_progress_is_blocked()
    {
        var (companyId, brigadeId, _, objectId, ownerId, brigadirId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);
        var brigadir = AsBrigadir(companyId, brigadirId);
        var workOrderId = await CreateAsync(owner, objectId, brigadeId);

        await using (var context = fixture.CreateDbContext(owner))
        {
            await new AssignWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
            await new StartWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None);
        }

        // No WorkOrderProgress added.
        await using var brigadirContext = fixture.CreateDbContext(brigadir);
        var submit = await new SubmitWorkOrderForReviewCommandHandler(brigadirContext, brigadir, Notifier)
            .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None);

        submit.IsFailure.Should().BeTrue();
        submit.Error.Code.Should().Be("WORK_ORDER_NO_PROGRESS");
    }

    [Fact]
    public void Reject_without_a_reason_fails_validation()
    {
        new RejectWorkOrderCommandValidator()
            .Validate(new RejectWorkOrderCommand(Guid.NewGuid(), ""))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Brigadir_from_a_different_brigade_cannot_submit_gets_not_found()
    {
        var (companyId, brigadeId, otherBrigadeId, objectId, ownerId, _) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);
        var workOrderId = await CreateAsync(owner, objectId, brigadeId);

        await using (var context = fixture.CreateDbContext(owner))
            await new AssignWorkOrderCommandHandler(context, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);

        // A brigadir who belongs to a different (real) brigade, not just an unmatched Guid.
        await using var seedContext = fixture.CreateDbContext();
        var strangerUser = User.Create("Stranger", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var strangerWorker = Worker.Create(companyId, otherBrigadeId, "Stranger Worker", "+992000000009",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 100m, new DateOnly(2020, 1, 1), userId: strangerUser.Id);
        seedContext.Users.Add(strangerUser);
        seedContext.Workers.Add(strangerWorker);
        await seedContext.SaveChangesAsync(CancellationToken.None);

        // Start/Assign/Accept/Reject/Close are Owner/Prorab-only actions
        // (gated at the controller, [Authorize(Roles = "Owner,Prorab")]) —
        // a Brigadir was never meant to reach them at all, so they don't
        // check brigade isolation (they check Prorab-object isolation,
        // which no-ops for Brigadir). Submit/Rework are the only two
        // actions actually gated to Brigadir, so those are what carry the
        // real brigade-isolation check — exercising it here via Submit.
        var stranger = AsBrigadir(companyId, strangerUser.Id);
        await using var strangerContext = fixture.CreateDbContext(stranger);
        var submit = await new SubmitWorkOrderForReviewCommandHandler(strangerContext, stranger, Notifier)
            .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None);

        submit.IsFailure.Should().BeTrue();
        submit.Error.Code.Should().Be("WORK_ORDER_NOT_FOUND", "cross-brigade access reads as 404, not 403, per MASTER §11.5/§4");
    }

    [Fact]
    public async Task Prorab_not_assigned_to_the_object_cannot_touch_its_work_order()
    {
        var (companyId, brigadeId, _, objectId, ownerId, _) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);
        var workOrderId = await CreateAsync(owner, objectId, brigadeId);

        await using var seedContext = fixture.CreateDbContext(owner);
        var otherObject = ConstructionObject.Create(companyId, "Other Object", (await seedContext.Customers.FirstAsync()).Id);
        var prorabUser = User.Create("Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        seedContext.ConstructionObjects.Add(otherObject);
        seedContext.Users.Add(prorabUser);
        // Assigns the Prorab to a DIFFERENT object only -> strict allow-list kicks in, excluding `objectId`.
        seedContext.ProrabObjectAssignments.Add(
            ProrabObjectAssignment.Create(companyId, prorabUser.Id, otherObject.Id, DateTimeOffset.UtcNow, owner.UserId!.Value));
        await seedContext.SaveChangesAsync(CancellationToken.None);

        ICurrentUserService prorab = new TestCurrentUserService { CompanyId = companyId, UserId = prorabUser.Id, Role = Role.Prorab };

        await using var prorabContext = fixture.CreateDbContext(prorab);
        var assign = await new AssignWorkOrderCommandHandler(prorabContext, prorab, Notifier)
            .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);

        assign.IsFailure.Should().BeTrue();
        assign.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
    }
}

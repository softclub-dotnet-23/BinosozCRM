using Application.Common.Interfaces;
using Application.Objects;
using Application.WorkOrders;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

file sealed class NoOpWorkOrderRealtimeNotifier : IWorkOrderRealtimeNotifier
{
    public Task NotifyStatusChangedAsync(Guid companyId, Guid workOrderId, string fromStatus, string toStatus, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}

// MASTER §11.5 rule 2/§1.2, §5.15: the transition handlers built in Phase 2
// Steps 1/3 apply two different isolation rules (Prorab via
// ProrabObjectAssignment on the order's object, Brigadir via their own
// BrigadeId) and must write TaskLog in the same transaction as the
// transition. This is the permanent coverage for both, real Postgres via
// PostgresFixture.
[Collection(PostgresCollection.Name)]
public sealed class WorkOrderIsolationTests(PostgresFixture fixture)
{
    private static readonly IWorkOrderRealtimeNotifier Notifier = new NoOpWorkOrderRealtimeNotifier();

    private async Task<(FixedCurrentUserService Owner, Guid ProrabUserId, Guid BrigadirUserId, Guid ObjectId, Guid BrigadeId, Guid OtherBrigadeId, Guid WorkOrderId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"WO Isolation Test Co {companyId}");
        var customer = Customer.Create(companyId, "Acme");
        var constructionObject = ConstructionObject.Create(companyId, "Object A", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade A");
        var otherBrigade = Brigade.Create(companyId, "Brigade B");
        var prorabUser = User.Create("Test Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var brigadirUser = User.Create("Test Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var brigadirWorker = Worker.Create(
            companyId, brigade.Id, "Brigadir Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1), userId: brigadirUser.Id);

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(constructionObject);
        context.Brigades.AddRange(brigade, otherBrigade);
        context.Users.AddRange(prorabUser, brigadirUser);
        context.Workers.Add(brigadirWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        var createResult = await new CreateWorkOrderCommandHandler(context, owner).Handle(
            new CreateWorkOrderCommand(constructionObject.Id, brigade.Id, "Do the thing", "m2", 10, 100, null, null),
            CancellationToken.None);
        createResult.IsSuccess.Should().BeTrue();

        return (owner, prorabUser.Id, brigadirUser.Id, constructionObject.Id, brigade.Id, otherBrigade.Id, createResult.Value.Id);
    }

    [Fact]
    public async Task Prorab_not_assigned_to_the_object_cannot_assign_the_work_order()
    {
        var (owner, prorabUserId, _, objectId, _, _, workOrderId) = await SeedAsync();

        // A second, unrelated object the Prorab IS assigned to — proves this
        // is a strict allow-list, not "the Prorab has no assignments at all".
        await using (var setupContext = fixture.CreateDbContext(owner))
        {
            var customer = Customer.Create(owner.CompanyId!.Value, "Other Customer");
            var otherObject = ConstructionObject.Create(owner.CompanyId!.Value, "Object Elsewhere", customer.Id);
            setupContext.Customers.Add(customer);
            setupContext.ConstructionObjects.Add(otherObject);
            await setupContext.SaveChangesAsync(CancellationToken.None);

            await new AssignProrabCommandHandler(setupContext, owner)
                .Handle(new AssignProrabCommand(otherObject.Id, prorabUserId), CancellationToken.None);
        }

        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);
        await using var context = fixture.CreateDbContext(prorab);
        var handler = new AssignWorkOrderCommandHandler(context, prorab, Notifier);

        var result = await handler.Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
        objectId.Should().NotBeEmpty(); // sanity: the object this Prorab needed access to
    }

    [Fact]
    public async Task Prorab_assigned_to_the_object_can_assign_and_TaskLog_is_written_in_the_same_save()
    {
        var (owner, prorabUserId, _, objectId, _, _, workOrderId) = await SeedAsync();

        await using (var setupContext = fixture.CreateDbContext(owner))
        {
            await new AssignProrabCommandHandler(setupContext, owner)
                .Handle(new AssignProrabCommand(objectId, prorabUserId), CancellationToken.None);
        }

        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);
        await using var context = fixture.CreateDbContext(prorab);
        var handler = new AssignWorkOrderCommandHandler(context, prorab, Notifier);

        var result = await handler.Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(WorkOrderStatus.Assigned);

        var log = context.TaskLogs.Single(l => l.EntityId == workOrderId);
        log.EntityType.Should().Be(TaskLogEntityType.WorkOrder);
        log.FromStatus.Should().Be("New");
        log.ToStatus.Should().Be("Assigned");
        log.ChangedByUserId.Should().Be(prorabUserId);
    }

    [Fact]
    public async Task Brigadir_of_a_different_brigade_cannot_start_the_work_order()
    {
        var (owner, _, _, objectId, brigadeId, otherBrigadeId, workOrderId) = await SeedAsync();
        _ = objectId;
        _ = brigadeId;

        await using (var assignContext = fixture.CreateDbContext(owner))
        {
            await new AssignWorkOrderCommandHandler(assignContext, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
        }

        var otherBrigadirUserId = Guid.NewGuid();
        await using (var setupContext = fixture.CreateDbContext(owner))
        {
            var otherBrigadirUser = User.Create("Other Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
            otherBrigadirUserId = otherBrigadirUser.Id;
            var otherWorker = Worker.Create(
                owner.CompanyId!.Value, otherBrigadeId, "Other Brigadir Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
                new DateOnly(1990, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1), userId: otherBrigadirUser.Id);
            setupContext.Users.Add(otherBrigadirUser);
            setupContext.Workers.Add(otherWorker);
            await setupContext.SaveChangesAsync(CancellationToken.None);
        }

        var otherBrigadir = new FixedCurrentUserService(owner.CompanyId!.Value, otherBrigadirUserId, Role.Brigadir);
        await using var context = fixture.CreateDbContext(otherBrigadir);
        var handler = new StartWorkOrderCommandHandler(context, otherBrigadir, Notifier);

        var result = await handler.Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_NOT_FOUND");
    }

    [Fact]
    public async Task Own_brigadir_can_start_after_assign_and_TaskLog_reflects_it()
    {
        var (owner, _, brigadirUserId, _, _, _, workOrderId) = await SeedAsync();

        await using (var assignContext = fixture.CreateDbContext(owner))
        {
            await new AssignWorkOrderCommandHandler(assignContext, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
        }

        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);
        var handler = new StartWorkOrderCommandHandler(context, brigadir, Notifier);

        var result = await handler.Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(WorkOrderStatus.InProgress);

        var logs = context.TaskLogs.Where(l => l.EntityId == workOrderId).OrderBy(l => l.ChangedAt).ToList();
        logs.Should().HaveCount(2);
        logs[1].FromStatus.Should().Be("Assigned");
        logs[1].ToStatus.Should().Be("InProgress");
        logs[1].ChangedByUserId.Should().Be(brigadirUserId);
    }

    [Fact]
    public async Task Reject_requires_a_reason_and_it_lands_in_TaskLog_Comment()
    {
        var (owner, _, brigadirUserId, _, _, _, workOrderId) = await SeedAsync();

        await using (var setupContext = fixture.CreateDbContext(owner))
        {
            await new AssignWorkOrderCommandHandler(setupContext, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
        }

        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        await using (var startContext = fixture.CreateDbContext(brigadir))
        {
            await new StartWorkOrderCommandHandler(startContext, brigadir, Notifier)
                .Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None);
        }

        await using (var progressContext = fixture.CreateDbContext(brigadir))
        {
            var order = progressContext.WorkOrders.Single(w => w.Id == workOrderId);
            progressContext.WorkOrderProgresses.Add(WorkOrderProgress.Create(
                owner.CompanyId!.Value, order.Id, brigadirUserId, 5, DateTimeOffset.UtcNow));
            await progressContext.SaveChangesAsync(CancellationToken.None);

            await new SubmitWorkOrderForReviewCommandHandler(progressContext, brigadir, Notifier)
                .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None);
        }

        await using var context = fixture.CreateDbContext(owner);
        var handler = new RejectWorkOrderCommandHandler(context, owner, Notifier);

        var result = await handler.Handle(new RejectWorkOrderCommand(workOrderId, "Not up to spec"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(WorkOrderStatus.Rejected);

        var log = context.TaskLogs
            .Where(l => l.EntityId == workOrderId)
            .OrderBy(l => l.ChangedAt)
            .Last();
        log.FromStatus.Should().Be("OnReview");
        log.ToStatus.Should().Be("Rejected");
        log.Comment.Should().Be("Not up to spec");
    }

    // MASTER §9.4/§11.5 rule 2: GET /work-orders/mine — Brigadir, own
    // brigade only. Punch-list closeout: ListWorkOrdersQuery's own comment
    // flagged this half as unbuilt back in Phase 6 Step 9's reconciliation.
    [Fact]
    public async Task ListMine_returns_only_the_callers_own_brigade_orders()
    {
        var (owner, _, brigadirUserId, objectId, brigadeId, otherBrigadeId, workOrderId) = await SeedAsync();

        Guid otherOrderId;
        await using (var context = fixture.CreateDbContext(owner))
        {
            var otherOrder = await new CreateWorkOrderCommandHandler(context, owner).Handle(
                new CreateWorkOrderCommand(objectId, otherBrigadeId, "Other brigade's order", "m2", 5, 100, null, null),
                CancellationToken.None);
            otherOrderId = otherOrder.Value.Id;
        }

        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        await using var context2 = fixture.CreateDbContext(brigadir);
        var result = await new ListMyWorkOrdersQueryHandler(context2, brigadir)
            .Handle(new ListMyWorkOrdersQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().ContainSingle(w => w.Id == workOrderId);
        result.Value.Items.Should().NotContain(w => w.Id == otherOrderId);
        otherBrigadeId.Should().NotBe(brigadeId);
    }

    [Fact]
    public async Task ListMine_for_a_user_with_no_linked_worker_row_gets_worker_not_found()
    {
        var (owner, _, _, _, _, _, _) = await SeedAsync();
        var unlinkedUser = new FixedCurrentUserService(owner.CompanyId!.Value, Guid.NewGuid(), Role.Brigadir);

        await using var context = fixture.CreateDbContext(unlinkedUser);
        var result = await new ListMyWorkOrdersQueryHandler(context, unlinkedUser)
            .Handle(new ListMyWorkOrdersQuery(1, 20), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_NOT_FOUND");
    }

    // MASTER §7.1: Rejected --доработка--> InProgress. Punch-list closeout
    // for WorkOrder.Rework(), which existed in Domain since Phase 2 but had
    // no handler wired to it.
    [Fact]
    public async Task Rework_moves_a_rejected_order_back_to_InProgress_and_TaskLog_records_it()
    {
        var (owner, _, brigadirUserId, _, _, _, workOrderId) = await SeedAsync();
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);

        await using (var setupContext = fixture.CreateDbContext(owner))
        {
            await new AssignWorkOrderCommandHandler(setupContext, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
        }

        await using (var startContext = fixture.CreateDbContext(brigadir))
        {
            await new StartWorkOrderCommandHandler(startContext, brigadir, Notifier)
                .Handle(new StartWorkOrderCommand(workOrderId), CancellationToken.None);
        }

        await using (var progressContext = fixture.CreateDbContext(brigadir))
        {
            progressContext.WorkOrderProgresses.Add(WorkOrderProgress.Create(
                owner.CompanyId!.Value, workOrderId, brigadirUserId, 5, DateTimeOffset.UtcNow));
            await progressContext.SaveChangesAsync(CancellationToken.None);

            await new SubmitWorkOrderForReviewCommandHandler(progressContext, brigadir, Notifier)
                .Handle(new SubmitWorkOrderForReviewCommand(workOrderId), CancellationToken.None);
        }

        await using (var rejectContext = fixture.CreateDbContext(owner))
        {
            await new RejectWorkOrderCommandHandler(rejectContext, owner, Notifier)
                .Handle(new RejectWorkOrderCommand(workOrderId, "Redo the corner"), CancellationToken.None);
        }

        await using (var reworkContext = fixture.CreateDbContext(brigadir))
        {
            var result = await new ReworkWorkOrderCommandHandler(reworkContext, brigadir, Notifier)
                .Handle(new ReworkWorkOrderCommand(workOrderId), CancellationToken.None);

            result.IsSuccess.Should().BeTrue();
            result.Value.Status.Should().Be(WorkOrderStatus.InProgress);
        }

        await using var readContext = fixture.CreateDbContext(owner);
        var log = readContext.TaskLogs.Where(l => l.EntityId == workOrderId).OrderBy(l => l.ChangedAt).Last();
        log.FromStatus.Should().Be("Rejected");
        log.ToStatus.Should().Be("InProgress");
    }

    // MASTER §7.1: Accepted --close--> Closed, "вручную Prorab" — the
    // manual half. Punch-list closeout for WorkOrder.Close().
    [Fact]
    public async Task Close_by_an_assigned_Prorab_succeeds_an_unassigned_one_is_rejected()
    {
        var (owner, prorabUserId, _, objectId, _, _, workOrderId) = await SeedAsync();

        await using (var acceptContext = fixture.CreateDbContext(owner))
        {
            await new AssignWorkOrderCommandHandler(acceptContext, owner, Notifier)
                .Handle(new AssignWorkOrderCommand(workOrderId, DateOnly.FromDateTime(DateTime.UtcNow)), CancellationToken.None);
        }

        await using (var context = fixture.CreateDbContext(owner))
        {
            var order = context.WorkOrders.Single(w => w.Id == workOrderId);
            order.Start();
            context.WorkOrderProgresses.Add(WorkOrderProgress.Create(owner.CompanyId!.Value, workOrderId, prorabUserId, 10, DateTimeOffset.UtcNow));
            order.SubmitForReview(hasProgress: true, payoutShareComplete: true);
            order.Accept(DateOnly.FromDateTime(DateTime.UtcNow));
            await context.SaveChangesAsync(CancellationToken.None);
        }

        var unassignedProrab = new FixedCurrentUserService(owner.CompanyId!.Value, Guid.NewGuid(), Role.Prorab);
        await using (var deniedContext = fixture.CreateDbContext(unassignedProrab))
        {
            var otherCustomer = Customer.Create(owner.CompanyId!.Value, "Elsewhere Customer");
            var otherObject = ConstructionObject.Create(owner.CompanyId!.Value, "Object Elsewhere", otherCustomer.Id);
            deniedContext.Customers.Add(otherCustomer);
            deniedContext.ConstructionObjects.Add(otherObject);
            await deniedContext.SaveChangesAsync(CancellationToken.None);

            await new AssignProrabCommandHandler(deniedContext, owner)
                .Handle(new AssignProrabCommand(otherObject.Id, unassignedProrab.UserId!.Value), CancellationToken.None);

            var deniedResult = await new CloseWorkOrderCommandHandler(deniedContext, unassignedProrab, Notifier)
                .Handle(new CloseWorkOrderCommand(workOrderId), CancellationToken.None);
            deniedResult.IsFailure.Should().BeTrue();
            deniedResult.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
        }

        await using var closeContext = fixture.CreateDbContext(owner);
        var closeResult = await new CloseWorkOrderCommandHandler(closeContext, owner, Notifier)
            .Handle(new CloseWorkOrderCommand(workOrderId), CancellationToken.None);

        closeResult.IsSuccess.Should().BeTrue();
        closeResult.Value.Status.Should().Be(WorkOrderStatus.Closed);
    }
}

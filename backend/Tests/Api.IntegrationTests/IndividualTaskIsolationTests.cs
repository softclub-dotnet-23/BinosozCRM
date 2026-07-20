using Application.IndividualTasks;
using Application.Objects;
using Application.WorkOrders;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §11.5 rule 2/§4: BrigadeId isolation for IndividualTask is manual
// (BrigadeAccess), not an EF global filter. A task belonging to another
// brigade must read as INDIVIDUAL_TASK_NOT_FOUND (404, not 403) — "не видит
// чужие бригады." Permanent coverage for Start/Complete/Create, real
// Postgres via PostgresFixture.
[Collection(PostgresCollection.Name)]
public sealed class IndividualTaskIsolationTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid BrigadirUserId, Guid OtherBrigadirUserId, Guid WorkerId, Guid OtherBrigadeWorkerId, Guid BrigadeId, Guid OtherBrigadeId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"Task Isolation Test Co {companyId}");
        var brigade = Brigade.Create(companyId, "Brigade A");
        var otherBrigade = Brigade.Create(companyId, "Brigade B");

        var brigadirUser = User.Create("Brigadir A", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var otherBrigadirUser = User.Create("Brigadir B", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);

        var adult = new DateOnly(1990, 1, 1);
        var hireDate = new DateOnly(2020, 1, 1);
        var brigadirWorker = Worker.Create(companyId, brigade.Id, "Brigadir A Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", adult, PayRateType.Hourly, 50m, hireDate, userId: brigadirUser.Id);
        var otherBrigadirWorker = Worker.Create(companyId, otherBrigade.Id, "Brigadir B Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", adult, PayRateType.Hourly, 50m, hireDate, userId: otherBrigadirUser.Id);
        var coWorker = Worker.Create(companyId, brigade.Id, "Co-worker A", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", adult, PayRateType.Hourly, 50m, hireDate);
        var otherBrigadeCoWorker = Worker.Create(companyId, otherBrigade.Id, "Co-worker B", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", adult, PayRateType.Hourly, 50m, hireDate);

        context.Companies.Add(company);
        context.Brigades.AddRange(brigade, otherBrigade);
        context.Users.AddRange(brigadirUser, otherBrigadirUser);
        context.Workers.AddRange(brigadirWorker, otherBrigadirWorker, coWorker, otherBrigadeCoWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner, brigadirUser.Id, otherBrigadirUser.Id, coWorker.Id, otherBrigadeCoWorker.Id, brigade.Id, otherBrigade.Id);
    }

    [Fact]
    public async Task Creating_a_task_for_a_worker_outside_own_brigade_is_rejected()
    {
        var (owner, brigadirUserId, _, _, otherBrigadeWorkerId, _, _) = await SeedAsync();

        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);
        var handler = new CreateIndividualTaskCommandHandler(context, brigadir);

        var result = await handler.Handle(
            new CreateIndividualTaskCommand(otherBrigadeWorkerId, "Cross-brigade task", null, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("INDIVIDUAL_TASK_WRONG_BRIGADE");
    }

    [Fact]
    public async Task Brigadir_of_a_different_brigade_cannot_start_the_task()
    {
        var (owner, brigadirUserId, otherBrigadirUserId, workerId, _, _, _) = await SeedAsync();

        Guid taskId;
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        await using (var createContext = fixture.CreateDbContext(brigadir))
        {
            var created = await new CreateIndividualTaskCommandHandler(createContext, brigadir)
                .Handle(new CreateIndividualTaskCommand(workerId, "Own task", null, null, null), CancellationToken.None);
            created.IsSuccess.Should().BeTrue();
            taskId = created.Value.Id;
        }

        var otherBrigadir = new FixedCurrentUserService(owner.CompanyId!.Value, otherBrigadirUserId, Role.Brigadir);
        await using var context = fixture.CreateDbContext(otherBrigadir);
        var startHandler = new StartIndividualTaskCommandHandler(context, otherBrigadir);

        var result = await startHandler.Handle(new StartIndividualTaskCommand(taskId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("INDIVIDUAL_TASK_NOT_FOUND");
    }

    [Fact]
    public async Task Own_brigadir_can_start_and_complete_and_TaskLog_records_both_transitions()
    {
        var (owner, brigadirUserId, _, workerId, _, _, _) = await SeedAsync();
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);

        Guid taskId;
        await using (var createContext = fixture.CreateDbContext(brigadir))
        {
            var created = await new CreateIndividualTaskCommandHandler(createContext, brigadir)
                .Handle(new CreateIndividualTaskCommand(workerId, "Own task", null, null, null), CancellationToken.None);
            taskId = created.Value.Id;
        }

        await using (var startContext = fixture.CreateDbContext(brigadir))
        {
            var startResult = await new StartIndividualTaskCommandHandler(startContext, brigadir)
                .Handle(new StartIndividualTaskCommand(taskId), CancellationToken.None);
            startResult.IsSuccess.Should().BeTrue();
            startResult.Value.Status.Should().Be(IndividualTaskStatus.InProgress);
        }

        await using var context = fixture.CreateDbContext(brigadir);
        var completeResult = await new CompleteIndividualTaskCommandHandler(context, brigadir)
            .Handle(new CompleteIndividualTaskCommand(taskId), CancellationToken.None);

        completeResult.IsSuccess.Should().BeTrue();
        completeResult.Value.Status.Should().Be(IndividualTaskStatus.Done);

        var logs = context.TaskLogs.Where(l => l.EntityId == taskId).OrderBy(l => l.ChangedAt).ToList();
        logs.Should().HaveCount(2);
        logs[0].FromStatus.Should().Be("Assigned");
        logs[0].ToStatus.Should().Be("InProgress");
        logs[1].FromStatus.Should().Be("InProgress");
        logs[1].ToStatus.Should().Be("Done");
        logs.Should().OnlyContain(l => l.EntityType == TaskLogEntityType.IndividualTask);
    }

    [Fact]
    public async Task A_user_with_no_linked_worker_row_gets_worker_not_found()
    {
        var (owner, _, _, workerId, _, _, _) = await SeedAsync();
        var unlinkedUser = new FixedCurrentUserService(owner.CompanyId!.Value, Guid.NewGuid(), Role.Brigadir);

        await using var context = fixture.CreateDbContext(unlinkedUser);
        var handler = new CreateIndividualTaskCommandHandler(context, unlinkedUser);

        var result = await handler.Handle(new CreateIndividualTaskCommand(workerId, "Task", null, null, null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_NOT_FOUND");
    }

    // MASTER §11.5 rule 3/§8.7 point 4: ApproveBonusCommand touches money
    // (bonus feeds the worker's PayrollEntry) via a task tied to a
    // WorkOrder — a Prorab not assigned to that order's object must not be
    // able to approve or override the amount, same isolation every other
    // WorkOrder-scoped handler already enforces.
    [Fact]
    public async Task Prorab_not_assigned_to_the_objects_object_cannot_approve_the_bonus()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        Guid taskId;
        Guid prorabUserId;

        await using (var context = fixture.CreateDbContext(owner))
        {
            var company = Company.Create(companyId, $"Bonus Isolation Test Co {companyId}");
            var customer = Customer.Create(companyId, "Acme");
            var constructionObject = ConstructionObject.Create(companyId, "Object A", customer.Id);
            var brigade = Brigade.Create(companyId, "Brigade A");
            var brigadirUser = User.Create("Brigadir A", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
            var prorabUser = User.Create("Prorab Elsewhere", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
            var adult = new DateOnly(1990, 1, 1);
            var hireDate = new DateOnly(2020, 1, 1);
            var brigadirWorker = Worker.Create(companyId, brigade.Id, "Brigadir A Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", adult, PayRateType.Hourly, 50m, hireDate, userId: brigadirUser.Id);

            context.Companies.Add(company);
            context.Customers.Add(customer);
            context.ConstructionObjects.Add(constructionObject);
            context.Brigades.Add(brigade);
            context.Users.AddRange(brigadirUser, prorabUser);
            context.Workers.Add(brigadirWorker);
            await context.SaveChangesAsync(CancellationToken.None);
            prorabUserId = prorabUser.Id;

            // Prorab is assigned to some OTHER object — proves this is a
            // strict allow-list, not "the Prorab has no assignments at all".
            var otherCustomer = Customer.Create(companyId, "Other Customer");
            var otherObject = ConstructionObject.Create(companyId, "Object Elsewhere", otherCustomer.Id);
            context.Customers.Add(otherCustomer);
            context.ConstructionObjects.Add(otherObject);
            await context.SaveChangesAsync(CancellationToken.None);
            await new AssignProrabCommandHandler(context, owner)
                .Handle(new AssignProrabCommand(otherObject.Id, prorabUserId), CancellationToken.None);

            var orderResult = await new CreateWorkOrderCommandHandler(context, owner).Handle(
                new CreateWorkOrderCommand(constructionObject.Id, brigade.Id, "Do the thing", "m2", 10, 100, null, null),
                CancellationToken.None);
            orderResult.IsSuccess.Should().BeTrue();

            var brigadir = new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir);
            await using var createContext = fixture.CreateDbContext(brigadir);
            var created = await new CreateIndividualTaskCommandHandler(createContext, brigadir).Handle(
                new CreateIndividualTaskCommand(brigadirWorker.Id, "Order task", null, orderResult.Value.Id, DateTimeOffset.UtcNow.AddDays(1)),
                CancellationToken.None);
            created.IsSuccess.Should().BeTrue();
            taskId = created.Value.Id;

            var completed = await new CompleteIndividualTaskCommandHandler(createContext, brigadir).Handle(
                new CompleteIndividualTaskCommand(taskId, BonusAmount: 50m), CancellationToken.None);
            completed.IsSuccess.Should().BeTrue();
        }

        var prorab = new FixedCurrentUserService(companyId, prorabUserId, Role.Prorab);
        await using var context2 = fixture.CreateDbContext(prorab);
        var result = await new ApproveBonusCommandHandler(context2, prorab)
            .Handle(new ApproveBonusCommand(taskId, OverrideAmount: null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
    }
}

using Application.Common.Interfaces;
using Application.IndividualTasks;
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

// MASTER §7.2 (IndividualTask state machine), §8.5 (brigade isolation).
// Phase 2 Step 9's BE half — see WorkOrderStateMachineTests for the split.
[Collection(PostgresCollection.Name)]
public sealed class IndividualTaskStateMachineTests(PostgresFixture fixture)
{
    private async Task<(Guid CompanyId, Guid BrigadeId, Guid OtherBrigadeId, Guid BrigadirId, Guid WorkerId)> SeedAsync()
    {
        await using var context = fixture.CreateDbContext();
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var brigade = Brigade.Create(company.Id, "Brigade");
        var otherBrigade = Brigade.Create(company.Id, "Other Brigade");
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var brigadirWorker = Worker.Create(company.Id, brigade.Id, "Brigadir Worker", "+992000000001",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 100m, new DateOnly(2020, 1, 1), userId: brigadirUser.Id);
        var otherWorker = Worker.Create(company.Id, brigade.Id, "Regular Worker", "+992000000002",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 100m, new DateOnly(2020, 1, 1));

        context.Companies.Add(company);
        context.Brigades.AddRange(brigade, otherBrigade);
        context.Users.Add(brigadirUser);
        context.Workers.AddRange(brigadirWorker, otherWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (company.Id, brigade.Id, otherBrigade.Id, brigadirUser.Id, otherWorker.Id);
    }

    private static ICurrentUserService AsBrigadir(Guid companyId, Guid brigadirId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = brigadirId, Role = Role.Brigadir };

    private async Task<Guid> CreateAsync(ICurrentUserService brigadir, Guid workerId, DateTimeOffset? dueAt = null)
    {
        await using var context = fixture.CreateDbContext(brigadir);
        var create = await new CreateIndividualTaskCommandHandler(context, brigadir)
            .Handle(new CreateIndividualTaskCommand(workerId, "Клади кирпич", null, null, dueAt), CancellationToken.None);
        return create.Value.Id;
    }

    [Fact]
    public async Task Full_happy_path_Assigned_to_InProgress_to_Done_writes_TaskLog_in_order()
    {
        var (companyId, _, _, brigadirId, workerId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);
        var taskId = await CreateAsync(brigadir, workerId);

        await using (var context = fixture.CreateDbContext(brigadir))
        {
            var start = await new StartIndividualTaskCommandHandler(context, brigadir)
                .Handle(new StartIndividualTaskCommand(taskId), CancellationToken.None);
            start.IsSuccess.Should().BeTrue();
            start.Value.Status.Should().Be(IndividualTaskStatus.InProgress);
        }

        await using (var context = fixture.CreateDbContext(brigadir))
        {
            var complete = await new CompleteIndividualTaskCommandHandler(context, brigadir)
                .Handle(new CompleteIndividualTaskCommand(taskId), CancellationToken.None);
            complete.IsSuccess.Should().BeTrue();
            complete.Value.Status.Should().Be(IndividualTaskStatus.Done);
        }

        await using var verifyContext = fixture.CreateDbContext(brigadir);
        var logs = await verifyContext.TaskLogs
            .Where(l => l.EntityId == taskId && l.EntityType == TaskLogEntityType.IndividualTask)
            .OrderBy(l => l.ChangedAt)
            .ToListAsync(CancellationToken.None);
        logs.Select(l => l.ToStatus).Should().ContainInOrder(nameof(IndividualTaskStatus.InProgress), nameof(IndividualTaskStatus.Done));
    }

    [Fact]
    public async Task CompletedEarly_is_true_when_finished_before_DueAt_and_false_when_finished_after()
    {
        var (companyId, _, _, brigadirId, workerId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);

        var earlyTaskId = await CreateAsync(brigadir, workerId, DateTimeOffset.UtcNow.AddDays(1));
        await using (var context = fixture.CreateDbContext(brigadir))
        {
            await new StartIndividualTaskCommandHandler(context, brigadir).Handle(new StartIndividualTaskCommand(earlyTaskId), CancellationToken.None);
            var complete = await new CompleteIndividualTaskCommandHandler(context, brigadir)
                .Handle(new CompleteIndividualTaskCommand(earlyTaskId), CancellationToken.None);
            complete.Value.CompletedEarly.Should().BeTrue();
        }

        var lateTaskId = await CreateAsync(brigadir, workerId, DateTimeOffset.UtcNow.AddMilliseconds(50));
        await using (var context = fixture.CreateDbContext(brigadir))
        {
            await new StartIndividualTaskCommandHandler(context, brigadir).Handle(new StartIndividualTaskCommand(lateTaskId), CancellationToken.None);
            await Task.Delay(100);
            var complete = await new CompleteIndividualTaskCommandHandler(context, brigadir)
                .Handle(new CompleteIndividualTaskCommand(lateTaskId), CancellationToken.None);
            complete.Value.CompletedEarly.Should().BeFalse();
        }
    }

    [Fact]
    public async Task Complete_before_start_is_rejected_not_an_exception()
    {
        var (companyId, _, _, brigadirId, workerId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);
        var taskId = await CreateAsync(brigadir, workerId);

        await using var context = fixture.CreateDbContext(brigadir);
        var complete = await new CompleteIndividualTaskCommandHandler(context, brigadir)
            .Handle(new CompleteIndividualTaskCommand(taskId), CancellationToken.None);

        complete.IsFailure.Should().BeTrue();
        complete.Error.Code.Should().Be("INDIVIDUAL_TASK_INVALID_TRANSITION");
    }

    [Fact]
    public async Task Starting_twice_is_rejected_not_an_exception()
    {
        var (companyId, _, _, brigadirId, workerId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);
        var taskId = await CreateAsync(brigadir, workerId);

        await using var context = fixture.CreateDbContext(brigadir);
        await new StartIndividualTaskCommandHandler(context, brigadir).Handle(new StartIndividualTaskCommand(taskId), CancellationToken.None);
        var secondStart = await new StartIndividualTaskCommandHandler(context, brigadir)
            .Handle(new StartIndividualTaskCommand(taskId), CancellationToken.None);

        secondStart.IsFailure.Should().BeTrue();
        secondStart.Error.Code.Should().Be("INDIVIDUAL_TASK_INVALID_TRANSITION");
    }

    [Fact]
    public async Task Create_rejects_a_worker_from_a_different_brigade()
    {
        var (companyId, _, otherBrigadeId, brigadirId, _) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);

        await using var context = fixture.CreateDbContext();
        var strangerWorker = Worker.Create(companyId, otherBrigadeId, "Stranger Worker", "+992000000009",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 100m, new DateOnly(2020, 1, 1));
        context.Workers.Add(strangerWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        await using var brigadirContext = fixture.CreateDbContext(brigadir);
        var create = await new CreateIndividualTaskCommandHandler(brigadirContext, brigadir)
            .Handle(new CreateIndividualTaskCommand(strangerWorker.Id, "Клади кирпич", null, null, null), CancellationToken.None);

        create.IsFailure.Should().BeTrue();
        create.Error.Code.Should().Be("INDIVIDUAL_TASK_WRONG_BRIGADE");
    }

    [Fact]
    public async Task Brigadir_from_a_different_brigade_cannot_start_gets_not_found()
    {
        var (companyId, _, otherBrigadeId, brigadirId, workerId) = await SeedAsync();
        var brigadir = AsBrigadir(companyId, brigadirId);
        var taskId = await CreateAsync(brigadir, workerId);

        await using var seedContext = fixture.CreateDbContext();
        var strangerUser = User.Create("Stranger", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var strangerWorker = Worker.Create(companyId, otherBrigadeId, "Stranger Worker", "+992000000009",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 100m, new DateOnly(2020, 1, 1), userId: strangerUser.Id);
        seedContext.Users.Add(strangerUser);
        seedContext.Workers.Add(strangerWorker);
        await seedContext.SaveChangesAsync(CancellationToken.None);

        var stranger = AsBrigadir(companyId, strangerUser.Id);
        await using var strangerContext = fixture.CreateDbContext(stranger);
        var start = await new StartIndividualTaskCommandHandler(strangerContext, stranger)
            .Handle(new StartIndividualTaskCommand(taskId), CancellationToken.None);

        start.IsFailure.Should().BeTrue();
        start.Error.Code.Should().Be("INDIVIDUAL_TASK_NOT_FOUND", "cross-brigade access reads as 404, not 403");
    }
}

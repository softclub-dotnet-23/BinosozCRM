using Application.IndividualTasks;
using Application.WorkOrders;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

// WorkOrder and IndividualTask deliberately share Company.NextCodeNumber.
// Company is not ICompanyOwned, so its lookup must use the current caller's
// CompanyId explicitly instead of relying on the global query filter.
[Collection(PostgresCollection.Name)]
public sealed class CompanyCodeSequenceIntegrationTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Creating_individual_task_uses_current_users_company_and_does_not_touch_foreign_sequence()
    {
        var seed = await SeedAsync();
        var currentUser = new FixedCurrentUserService(seed.TargetCompany.Id, seed.Brigadir.Id, Role.Brigadir);
        Guid taskId;

        await using (var context = fixture.CreateDbContext(currentUser))
        {
            var result = await new CreateIndividualTaskCommandHandler(context, currentUser).Handle(
                new CreateIndividualTaskCommand(seed.BrigadirWorker.Id, "Second company task", null, null, null),
                CancellationToken.None);

            result.IsSuccess.Should().BeTrue();
            result.Value.Code.Should().Be("BR-1");
            taskId = result.Value.Id;
        }

        await using var verificationContext = fixture.CreateDbContext();
        var targetCompany = await verificationContext.Companies.SingleAsync(company => company.Id == seed.TargetCompany.Id);
        var foreignCompany = await verificationContext.Companies.SingleAsync(company => company.Id == seed.ForeignCompany.Id);
        var task = await verificationContext.IndividualTasks.IgnoreQueryFilters().SingleAsync(task => task.Id == taskId);

        targetCompany.NextCodeNumber.Should().Be(2);
        foreignCompany.NextCodeNumber.Should().Be(1);
        task.CompanyId.Should().Be(seed.TargetCompany.Id);
        task.Code.Should().Be("BR-1");
        (await verificationContext.IndividualTasks.IgnoreQueryFilters()
                .CountAsync(item => item.CompanyId == seed.TargetCompany.Id && item.Code == task.Code))
            .Should().Be(1);
    }

    [Fact]
    public async Task Work_order_and_individual_task_share_one_company_code_sequence_without_touching_foreign_company()
    {
        var seed = await SeedAsync();
        var owner = new FixedCurrentUserService(seed.TargetCompany.Id, seed.Owner.Id, Role.Owner);
        var brigadir = new FixedCurrentUserService(seed.TargetCompany.Id, seed.Brigadir.Id, Role.Brigadir);
        Guid workOrderId;
        Guid taskId;
        string workOrderCode;
        string taskCode;

        await using (var workOrderContext = fixture.CreateDbContext(owner))
        {
            var workOrderResult = await new CreateWorkOrderCommandHandler(workOrderContext, owner).Handle(
                new CreateWorkOrderCommand(
                    seed.ConstructionObject.Id,
                    seed.Brigade.Id,
                    "Shared sequence work order",
                    "m2",
                    10m,
                    100m,
                    null,
                    null),
                CancellationToken.None);

            workOrderResult.IsSuccess.Should().BeTrue();
            workOrderCode = workOrderResult.Value.Code;
            workOrderId = workOrderResult.Value.Id;
        }

        await using (var taskContext = fixture.CreateDbContext(brigadir))
        {
            var taskResult = await new CreateIndividualTaskCommandHandler(taskContext, brigadir).Handle(
                new CreateIndividualTaskCommand(seed.BrigadirWorker.Id, "Shared sequence task", null, workOrderId, null),
                CancellationToken.None);

            taskResult.IsSuccess.Should().BeTrue();
            taskCode = taskResult.Value.Code;
            taskId = taskResult.Value.Id;
        }

        await using var verificationContext = fixture.CreateDbContext();
        var targetCompany = await verificationContext.Companies.SingleAsync(company => company.Id == seed.TargetCompany.Id);
        var foreignCompany = await verificationContext.Companies.SingleAsync(company => company.Id == seed.ForeignCompany.Id);
        var workOrder = await verificationContext.WorkOrders.IgnoreQueryFilters().SingleAsync(order => order.Id == workOrderId);
        var task = await verificationContext.IndividualTasks.IgnoreQueryFilters().SingleAsync(item => item.Id == taskId);

        workOrderCode.Should().Be("BR-1");
        taskCode.Should().Be("BR-2");
        new[] { workOrderCode, taskCode }.Should().OnlyHaveUniqueItems();
        targetCompany.NextCodeNumber.Should().Be(3);
        foreignCompany.NextCodeNumber.Should().Be(1);
        workOrder.CompanyId.Should().Be(seed.TargetCompany.Id);
        task.CompanyId.Should().Be(seed.TargetCompany.Id);
        workOrder.Code.Should().Be(workOrderCode);
        task.Code.Should().Be(taskCode);
    }

    private async Task<CompanyCodeSequenceSeed> SeedAsync()
    {
        var foreignCompany = Company.Create(Guid.NewGuid(), $"Foreign code sequence company {Guid.NewGuid():N}");
        var targetCompany = Company.Create(Guid.NewGuid(), $"Target code sequence company {Guid.NewGuid():N}");
        var owner = User.Create(targetCompany.Id, "Target owner", NewPhone(), "hash", Role.Owner);
        var brigadir = User.Create(targetCompany.Id, "Target brigadir", NewPhone(), "hash", Role.Brigadir);
        var customer = Customer.Create(targetCompany.Id, "Target customer");
        var constructionObject = ConstructionObject.Create(targetCompany.Id, "Target object", customer.Id);
        var brigade = Brigade.Create(targetCompany.Id, "Target brigade");
        brigade.AssignBrigadir(brigadir.Id);
        var brigadirWorker = Worker.Create(
            targetCompany.Id,
            brigade.Id,
            "Target brigadir worker",
            NewPhone(),
            new DateOnly(1990, 1, 1),
            PayRateType.Hourly,
            50m,
            new DateOnly(2020, 1, 1),
            userId: brigadir.Id);

        var seedUser = new FixedCurrentUserService(targetCompany.Id, owner.Id, Role.Owner);
        await using var context = fixture.CreateDbContext(seedUser);
        context.AddRange(
            foreignCompany,
            targetCompany,
            owner,
            brigadir,
            customer,
            constructionObject,
            brigade,
            brigadirWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        return new CompanyCodeSequenceSeed(
            foreignCompany,
            targetCompany,
            owner,
            brigadir,
            constructionObject,
            brigade,
            brigadirWorker);
    }

    private static string NewPhone() => $"+992{Random.Shared.NextInt64(100000000, 999999999)}";

    private sealed record CompanyCodeSequenceSeed(
        Company ForeignCompany,
        Company TargetCompany,
        User Owner,
        User Brigadir,
        ConstructionObject ConstructionObject,
        Brigade Brigade,
        Worker BrigadirWorker);
}

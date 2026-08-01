using Application.Lookups;
using Application.Materials;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// Real PostgreSQL coverage for the lookup contracts. These exercise the same
// tenant query filters and manual Prorab/Brigadir scopes used in production;
// HTTP authentication/pipeline coverage is intentionally owned by the API
// smoke suite, not duplicated by controller-unit calls here.
[Collection(PostgresCollection.Name)]
public sealed class LookupQueryTests(PostgresFixture fixture)
{
    private sealed record LookupSeed(
        FixedCurrentUserService Owner,
        FixedCurrentUserService Prorab,
        FixedCurrentUserService Brigadir,
        Guid WorkerInBrigadeAId,
        Guid WorkerInBrigadeBId,
        Guid ForeignWorkerId,
        Guid ObjectAId,
        Guid ObjectBId,
        Guid ForeignObjectId);

    private async Task<LookupSeed> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var foreignCompanyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);

        var prorabUser = User.Create(companyId, "Lookup Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var brigadirUser = User.Create(companyId, "Lookup Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var company = Company.Create(companyId, $"Lookup Company {companyId}");
        var foreignCompany = Company.Create(foreignCompanyId, $"Foreign Lookup Company {foreignCompanyId}");
        var customer = Customer.Create(companyId, "Lookup Customer");
        var foreignCustomer = Customer.Create(foreignCompanyId, "Foreign Lookup Customer");
        var objectA = ConstructionObject.Create(companyId, "Alpha Tower", customer.Id);
        var objectB = ConstructionObject.Create(companyId, "Beta Depot", customer.Id);
        var foreignObject = ConstructionObject.Create(foreignCompanyId, "Foreign Object", foreignCustomer.Id);
        var brigadeA = Brigade.Create(companyId, "Lookup Brigade A");
        var brigadeB = Brigade.Create(companyId, "Lookup Brigade B");
        var foreignBrigade = Brigade.Create(foreignCompanyId, "Foreign Brigade");
        brigadeA.AssignBrigadir(brigadirUser.Id);

        var workerInBrigadeA = Worker.Create(
            companyId,
            brigadeA.Id,
            "Alice Builder",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1),
            PayRateType.Hourly,
            40m,
            new DateOnly(2020, 1, 1),
            brigadirUser.Id);
        var workerInBrigadeB = Worker.Create(
            companyId,
            brigadeB.Id,
            "Bob Mason",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1991, 1, 1),
            PayRateType.Piecework,
            0m,
            new DateOnly(2020, 1, 1));
        var foreignWorker = Worker.Create(
            foreignCompanyId,
            foreignBrigade.Id,
            "Foreign Worker",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1992, 1, 1),
            PayRateType.Hourly,
            50m,
            new DateOnly(2020, 1, 1));

        var ownWorkOrder = WorkOrder.Create(
            companyId,
            "LOOKUP-A",
            objectA.Id,
            brigadeA.Id,
            "Own brigade assignment",
            "m2",
            1m,
            1m,
            owner.UserId!.Value);
        var otherWorkOrder = WorkOrder.Create(
            companyId,
            "LOOKUP-B",
            objectB.Id,
            brigadeB.Id,
            "Other brigade assignment",
            "m2",
            1m,
            1m,
            owner.UserId!.Value);

        var delivery = MaterialDelivery.Create(
            companyId,
            objectA.Id,
            "Cement",
            "bag",
            5m,
            10m,
            DateTimeOffset.UtcNow);
        var consumption = MaterialConsumptionReport.Create(
            companyId,
            objectA.Id,
            brigadeA.Id,
            brigadirUser.Id,
            new DateOnly(2026, 8, 1),
            "Cement",
            "bag",
            2m,
            0m);

        await using var context = fixture.CreateDbContext(owner);
        context.AddRange(
            company,
            foreignCompany,
            prorabUser,
            brigadirUser,
            customer,
            foreignCustomer,
            objectA,
            objectB,
            foreignObject,
            brigadeA,
            brigadeB,
            foreignBrigade,
            workerInBrigadeA,
            workerInBrigadeB,
            foreignWorker,
            ownWorkOrder,
            otherWorkOrder,
            delivery,
            consumption,
            ProrabObjectAssignment.Create(companyId, prorabUser.Id, objectA.Id, DateTimeOffset.UtcNow, owner.UserId.Value));
        await context.SaveChangesAsync(CancellationToken.None);

        return new LookupSeed(
            owner,
            new FixedCurrentUserService(companyId, prorabUser.Id, Role.Prorab),
            new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir),
            workerInBrigadeA.Id,
            workerInBrigadeB.Id,
            foreignWorker.Id,
            objectA.Id,
            objectB.Id,
            foreignObject.Id);
    }

    [Fact]
    public async Task Owner_lookups_return_only_current_company_items()
    {
        var seed = await SeedAsync();

        await using var context = fixture.CreateDbContext(seed.Owner);
        var workers = await new ListWorkerLookupsQueryHandler(context, seed.Owner)
            .Handle(new ListWorkerLookupsQuery(null, null, 100), CancellationToken.None);
        var objects = await new ListObjectLookupsQueryHandler(context, seed.Owner)
            .Handle(new ListObjectLookupsQuery(null, null, 100), CancellationToken.None);

        workers.IsSuccess.Should().BeTrue();
        workers.Value.Select(item => item.Id).Should().BeEquivalentTo([seed.WorkerInBrigadeAId, seed.WorkerInBrigadeBId]);
        workers.Value.Select(item => item.Id).Should().NotContain(seed.ForeignWorkerId);
        objects.IsSuccess.Should().BeTrue();
        objects.Value.Select(item => item.Id).Should().BeEquivalentTo([seed.ObjectAId, seed.ObjectBId]);
        objects.Value.Select(item => item.Id).Should().NotContain(seed.ForeignObjectId);
    }

    [Fact]
    public async Task Prorab_object_lookup_uses_existing_assignment_allow_list_and_worker_lookup_preserves_existing_company_scope()
    {
        var seed = await SeedAsync();

        await using var context = fixture.CreateDbContext(seed.Prorab);
        var workers = await new ListWorkerLookupsQueryHandler(context, seed.Prorab)
            .Handle(new ListWorkerLookupsQuery(null, null, 100), CancellationToken.None);
        var objects = await new ListObjectLookupsQueryHandler(context, seed.Prorab)
            .Handle(new ListObjectLookupsQuery(null, null, 100), CancellationToken.None);

        workers.IsSuccess.Should().BeTrue();
        workers.Value.Select(item => item.Id).Should().BeEquivalentTo([seed.WorkerInBrigadeAId, seed.WorkerInBrigadeBId]);
        objects.IsSuccess.Should().BeTrue();
        objects.Value.Select(item => item.Id).Should().ContainSingle().Which.Should().Be(seed.ObjectAId);
    }

    [Fact]
    public async Task Brigadir_lookups_fail_closed_to_own_brigade_and_its_work_order_objects()
    {
        var seed = await SeedAsync();

        await using var context = fixture.CreateDbContext(seed.Brigadir);
        var workers = await new ListWorkerLookupsQueryHandler(context, seed.Brigadir)
            .Handle(new ListWorkerLookupsQuery(null, null, 100), CancellationToken.None);
        var objects = await new ListObjectLookupsQueryHandler(context, seed.Brigadir)
            .Handle(new ListObjectLookupsQuery(null, null, 100), CancellationToken.None);

        workers.IsSuccess.Should().BeTrue();
        workers.Value.Select(item => item.Id).Should().ContainSingle().Which.Should().Be(seed.WorkerInBrigadeAId);
        objects.IsSuccess.Should().BeTrue();
        objects.Value.Select(item => item.Id).Should().ContainSingle().Which.Should().Be(seed.ObjectAId);
    }

    [Fact]
    public async Task Brigadir_without_linked_worker_fails_closed()
    {
        var seed = await SeedAsync();
        var brigadirWithoutBrigade = new FixedCurrentUserService(seed.Owner.CompanyId!.Value, Guid.NewGuid(), Role.Brigadir);

        await using var context = fixture.CreateDbContext(brigadirWithoutBrigade);
        var workerResult = await new ListWorkerLookupsQueryHandler(context, brigadirWithoutBrigade)
            .Handle(new ListWorkerLookupsQuery(null, null, 20), CancellationToken.None);
        var objectResult = await new ListObjectLookupsQueryHandler(context, brigadirWithoutBrigade)
            .Handle(new ListObjectLookupsQuery(null, null, 20), CancellationToken.None);

        workerResult.IsFailure.Should().BeTrue();
        workerResult.Error.Code.Should().Be("WORKER_NOT_FOUND");
        objectResult.IsFailure.Should().BeTrue();
        objectResult.Error.Code.Should().Be("WORKER_NOT_FOUND");
    }

    [Fact]
    public async Task Lookups_support_repeated_id_filters_case_insensitive_search_and_a_bounded_limit()
    {
        var seed = await SeedAsync();

        await using var context = fixture.CreateDbContext(seed.Owner);
        var workers = await new ListWorkerLookupsQueryHandler(context, seed.Owner)
            .Handle(
                new ListWorkerLookupsQuery([seed.WorkerInBrigadeAId, seed.WorkerInBrigadeBId, seed.ForeignWorkerId], "ALICE", 1),
                CancellationToken.None);
        var objects = await new ListObjectLookupsQueryHandler(context, seed.Owner)
            .Handle(
                new ListObjectLookupsQuery([seed.ObjectAId, seed.ObjectBId, seed.ForeignObjectId], "tower", 1),
                CancellationToken.None);

        workers.Value.Should().ContainSingle(item => item.Id == seed.WorkerInBrigadeAId && item.Name == "Alice Builder");
        objects.Value.Should().ContainSingle(item => item.Id == seed.ObjectAId && item.Name == "Alpha Tower");
    }

    [Fact]
    public async Task Lookup_contract_exposes_only_id_and_name_and_operational_material_dtos_include_object_name()
    {
        var seed = await SeedAsync();

        typeof(LookupItemDto).GetProperties().Select(property => property.Name)
            .Should().BeEquivalentTo(["Id", "Name"]);

        await using var context = fixture.CreateDbContext(seed.Owner);
        var deliveries = await new ListMaterialDeliveriesQueryHandler(context, seed.Owner)
            .Handle(new ListMaterialDeliveriesQuery(1, 20), CancellationToken.None);
        var writeOffs = await new ListMaterialConsumptionReportsQueryHandler(context, seed.Owner)
            .Handle(new ListMaterialConsumptionReportsQuery(1, 20), CancellationToken.None);

        deliveries.Value.Items.Should().ContainSingle(delivery => delivery.ObjectId == seed.ObjectAId && delivery.ObjectName == "Alpha Tower");
        writeOffs.Value.Items.Should().ContainSingle(report => report.ObjectId == seed.ObjectAId && report.ObjectName == "Alpha Tower");
    }
}

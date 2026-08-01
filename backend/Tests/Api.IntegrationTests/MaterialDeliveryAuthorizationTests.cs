using Application.Materials;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class MaterialDeliveryAuthorizationTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, FixedCurrentUserService AssignedProrab, FixedCurrentUserService UnassignedProrab, Guid ObjectAId, Guid ObjectBId, Guid OrderedRequestId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        var assignedProrabUser = User.Create(companyId, "Assigned Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var unassignedProrabUser = User.Create(companyId, "Unassigned Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var brigadirUser = User.Create(companyId, "Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var company = Company.Create(companyId, $"Delivery authorization {companyId}");
        var customer = Customer.Create(companyId, "Customer");
        var objectA = ConstructionObject.Create(companyId, "Object A", customer.Id);
        var objectB = ConstructionObject.Create(companyId, "Object B", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade");
        var worker = Worker.Create(companyId, brigade.Id, "Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1), brigadirUser.Id);
        var request = MaterialRequest.Create(companyId, objectB.Id, brigade.Id, brigadirUser.Id, "Cement", "bag", 10m, DateTimeOffset.UtcNow);
        request.Approve(assignedProrabUser.Id, DateTimeOffset.UtcNow);
        request.MarkOrdered();

        await using var context = fixture.CreateDbContext(owner);
        context.AddRange(company, customer, objectA, objectB, brigade, assignedProrabUser, unassignedProrabUser, brigadirUser, worker, request,
            ProrabObjectAssignment.Create(companyId, assignedProrabUser.Id, objectA.Id, DateTimeOffset.UtcNow, owner.UserId!.Value),
            ProrabObjectAssignment.Create(companyId, unassignedProrabUser.Id, objectA.Id, DateTimeOffset.UtcNow, owner.UserId!.Value));
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner,
            new FixedCurrentUserService(companyId, assignedProrabUser.Id, Role.Prorab),
            new FixedCurrentUserService(companyId, unassignedProrabUser.Id, Role.Prorab),
            objectA.Id, objectB.Id, request.Id);
    }

    [Fact]
    public async Task Assigned_prorab_can_create_single_and_document_deliveries_for_assigned_object()
    {
        var (_, prorab, _, objectAId, _, _) = await SeedAsync();

        await using var context = fixture.CreateDbContext(prorab);
        var single = await new CreateMaterialDeliveryCommandHandler(context, prorab)
            .Handle(new CreateMaterialDeliveryCommand(objectAId, null, "Cement", "bag", 1m, 10m, null), CancellationToken.None);
        var document = await new CreateMaterialDeliveryDocumentCommandHandler(context, prorab)
            .Handle(new CreateMaterialDeliveryDocumentCommand(objectAId, null, [new MaterialDeliveryDocumentLineInput("Sand", "bag", 1m, 5m)]), CancellationToken.None);

        single.IsSuccess.Should().BeTrue();
        document.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Unassigned_prorab_is_rejected_by_single_and_document_flows()
    {
        var (_, _, prorab, _, objectBId, _) = await SeedAsync();

        await using var context = fixture.CreateDbContext(prorab);
        var single = await new CreateMaterialDeliveryCommandHandler(context, prorab)
            .Handle(new CreateMaterialDeliveryCommand(objectBId, null, "Cement", "bag", 1m, 10m, null), CancellationToken.None);
        var document = await new CreateMaterialDeliveryDocumentCommandHandler(context, prorab)
            .Handle(new CreateMaterialDeliveryDocumentCommand(objectBId, null, [new MaterialDeliveryDocumentLineInput("Sand", "bag", 1m, 5m)]), CancellationToken.None);

        single.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
        document.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
    }

    [Fact]
    public async Task Owner_retains_single_and_document_delivery_access()
    {
        var (owner, _, _, _, objectBId, _) = await SeedAsync();

        await using var context = fixture.CreateDbContext(owner);
        var single = await new CreateMaterialDeliveryCommandHandler(context, owner)
            .Handle(new CreateMaterialDeliveryCommand(objectBId, null, "Cement", "bag", 1m, 10m, null), CancellationToken.None);
        var document = await new CreateMaterialDeliveryDocumentCommandHandler(context, owner)
            .Handle(new CreateMaterialDeliveryDocumentCommand(objectBId, null, [new MaterialDeliveryDocumentLineInput("Sand", "bag", 1m, 5m)]), CancellationToken.None);

        single.IsSuccess.Should().BeTrue();
        document.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Request_linked_to_another_object_is_rejected_without_changing_it()
    {
        var (owner, _, _, objectAId, _, requestId) = await SeedAsync();

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateMaterialDeliveryCommandHandler(context, owner)
            .Handle(new CreateMaterialDeliveryCommand(objectAId, requestId, "Cement", "bag", 1m, 10m, null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("MATERIAL_REQUEST_NOT_FOUND");
        context.MaterialRequests.Single(r => r.Id == requestId).QtyDelivered.Should().Be(0m);
    }

    [Fact]
    public async Task Another_company_cannot_create_deliveries_in_either_flow()
    {
        var (_, _, _, objectAId, _, _) = await SeedAsync();
        var outsider = new FixedCurrentUserService(Guid.NewGuid(), Guid.NewGuid(), Role.Owner);

        await using var context = fixture.CreateDbContext(outsider);
        var single = await new CreateMaterialDeliveryCommandHandler(context, outsider)
            .Handle(new CreateMaterialDeliveryCommand(objectAId, null, "Cement", "bag", 1m, 10m, null), CancellationToken.None);
        var document = await new CreateMaterialDeliveryDocumentCommandHandler(context, outsider)
            .Handle(new CreateMaterialDeliveryDocumentCommand(objectAId, null, [new MaterialDeliveryDocumentLineInput("Sand", "bag", 1m, 5m)]), CancellationToken.None);

        single.Error.Code.Should().Be("OBJECT_NOT_FOUND");
        document.Error.Code.Should().Be("OBJECT_NOT_FOUND");
    }
}

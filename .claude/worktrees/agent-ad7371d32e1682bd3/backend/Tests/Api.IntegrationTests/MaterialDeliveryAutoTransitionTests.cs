using Application.Materials;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §8.2's "Частичные поставки" gap (№6) + §7.3: creating a
// MaterialDelivery against a MaterialRequest auto-transitions the request
// — "переход автоматический, не ручной, иначе прораб забудет" — real
// Postgres via PostgresFixture, permanent coverage for what Step 3's
// throwaway check first verified.
[Collection(PostgresCollection.Name)]
public sealed class MaterialDeliveryAutoTransitionTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid ProrabUserId, Guid BrigadirUserId, Guid ObjectId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"Delivery Auto-Transition Test Co {companyId}");
        var customer = Customer.Create(companyId, "Acme");
        var constructionObject = ConstructionObject.Create(companyId, "Object A", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade A");
        var prorabUser = User.Create("Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        var brigadirUser = User.Create("Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        var brigadirWorker = Worker.Create(
            companyId, brigade.Id, "Brigadir Worker", $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1), PayRateType.Hourly, 40m, new DateOnly(2020, 1, 1), userId: brigadirUser.Id);

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(constructionObject);
        context.Brigades.Add(brigade);
        context.Users.AddRange(prorabUser, brigadirUser);
        context.Workers.Add(brigadirWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner, prorabUser.Id, brigadirUser.Id, constructionObject.Id);
    }

    private async Task<Guid> CreateOrderedRequestAsync(FixedCurrentUserService owner, Guid prorabUserId, Guid brigadirUserId, Guid objectId, decimal qty)
    {
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        Guid requestId;
        await using (var createContext = fixture.CreateDbContext(brigadir))
        {
            var created = await new CreateMaterialRequestCommandHandler(createContext, brigadir)
                .Handle(new CreateMaterialRequestCommand(objectId, "Cement", "bag", qty), CancellationToken.None);
            requestId = created.Value.Id;
        }

        await using (var approveContext = fixture.CreateDbContext(prorab))
        {
            await new ApproveMaterialRequestCommandHandler(approveContext, prorab)
                .Handle(new ApproveMaterialRequestCommand(requestId), CancellationToken.None);
        }

        await using (var orderContext = fixture.CreateDbContext(prorab))
        {
            await new MarkMaterialRequestOrderedCommandHandler(orderContext, prorab)
                .Handle(new MarkMaterialRequestOrderedCommand(requestId), CancellationToken.None);
        }

        return requestId;
    }

    [Fact]
    public async Task Partial_delivery_moves_request_to_PartiallyDelivered()
    {
        var (owner, prorabUserId, brigadirUserId, objectId) = await SeedAsync();
        var requestId = await CreateOrderedRequestAsync(owner, prorabUserId, brigadirUserId, objectId, qty: 100);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        await using var context = fixture.CreateDbContext(prorab);
        var delivery = await new CreateMaterialDeliveryCommandHandler(context, prorab).Handle(
            new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bag", 40, 10m, "Supplier X"),
            CancellationToken.None);

        delivery.IsSuccess.Should().BeTrue();

        var request = context.MaterialRequests.Single(r => r.Id == requestId);
        request.Status.Should().Be(MaterialRequestStatus.PartiallyDelivered);
        request.QtyDelivered.Should().Be(40);
    }

    [Fact]
    public async Task Deliveries_summing_to_full_qty_move_request_to_Delivered()
    {
        var (owner, prorabUserId, brigadirUserId, objectId) = await SeedAsync();
        var requestId = await CreateOrderedRequestAsync(owner, prorabUserId, brigadirUserId, objectId, qty: 100);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        await using (var firstContext = fixture.CreateDbContext(prorab))
        {
            await new CreateMaterialDeliveryCommandHandler(firstContext, prorab)
                .Handle(new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bag", 60, 10m, null), CancellationToken.None);
        }

        await using var context = fixture.CreateDbContext(prorab);
        var second = await new CreateMaterialDeliveryCommandHandler(context, prorab)
            .Handle(new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bag", 40, 10m, null), CancellationToken.None);

        second.IsSuccess.Should().BeTrue();
        var request = context.MaterialRequests.Single(r => r.Id == requestId);
        request.Status.Should().Be(MaterialRequestStatus.Delivered);
        request.QtyDelivered.Should().Be(100);
    }

    [Fact]
    public async Task Overdelivery_is_allowed_and_reads_as_Delivered()
    {
        var (owner, prorabUserId, brigadirUserId, objectId) = await SeedAsync();
        var requestId = await CreateOrderedRequestAsync(owner, prorabUserId, brigadirUserId, objectId, qty: 100);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        await using var context = fixture.CreateDbContext(prorab);
        var delivery = await new CreateMaterialDeliveryCommandHandler(context, prorab).Handle(
            new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bag", 120, 10m, null), CancellationToken.None);

        delivery.IsSuccess.Should().BeTrue();
        var request = context.MaterialRequests.Single(r => r.Id == requestId);
        request.Status.Should().Be(MaterialRequestStatus.Delivered);
        request.QtyDelivered.Should().Be(120);
    }

    [Fact]
    public async Task Delivery_without_a_request_id_is_valid_and_touches_no_request()
    {
        var (owner, _, _, objectId) = await SeedAsync();

        await using var context = fixture.CreateDbContext(owner);
        var delivery = await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
            new CreateMaterialDeliveryCommand(objectId, null, "Nails", "kg", 5, 3m, "Hardware Store"), CancellationToken.None);

        delivery.IsSuccess.Should().BeTrue();
        delivery.Value.MaterialRequestId.Should().BeNull();
    }

    [Fact]
    public async Task Delivering_against_an_Approved_but_not_Ordered_request_fails()
    {
        var (owner, prorabUserId, brigadirUserId, objectId) = await SeedAsync();
        var brigadir = new FixedCurrentUserService(owner.CompanyId!.Value, brigadirUserId, Role.Brigadir);
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        Guid requestId;
        await using (var createContext = fixture.CreateDbContext(brigadir))
        {
            var created = await new CreateMaterialRequestCommandHandler(createContext, brigadir)
                .Handle(new CreateMaterialRequestCommand(objectId, "Cement", "bag", 100), CancellationToken.None);
            requestId = created.Value.Id;
        }

        await using (var approveContext = fixture.CreateDbContext(prorab))
        {
            await new ApproveMaterialRequestCommandHandler(approveContext, prorab)
                .Handle(new ApproveMaterialRequestCommand(requestId), CancellationToken.None);
        }
        // deliberately skip MarkOrdered

        await using var context = fixture.CreateDbContext(prorab);
        var delivery = await new CreateMaterialDeliveryCommandHandler(context, prorab).Handle(
            new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bag", 10, 10m, null), CancellationToken.None);

        delivery.IsFailure.Should().BeTrue();
        delivery.Error.Code.Should().Be("MATERIAL_REQUEST_INVALID_TRANSITION");
    }
}

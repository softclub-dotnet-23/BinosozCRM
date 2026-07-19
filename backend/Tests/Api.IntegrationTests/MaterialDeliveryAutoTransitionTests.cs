using Application.Common.Interfaces;
using Application.MaterialDeliveries;
using Application.MaterialRequests;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

file sealed class TestCurrentUserService : ICurrentUserService
{
    public Guid? UserId { get; set; }
    public Guid? CompanyId { get; set; }
    public Role? Role { get; set; }
}

// MASTER §7.3/§8.2: Approved/Ordered -> PartiallyDelivered -> Delivered,
// driven by Σ Delivery.Qty vs Request.Qty. Phase 4 Step 6 — promotes Step
// 3's throwaway checks into permanent coverage.
[Collection(PostgresCollection.Name)]
public sealed class MaterialDeliveryAutoTransitionTests(PostgresFixture fixture)
{
    private async Task<(Guid CompanyId, Guid ObjectId, Guid OwnerId, Guid RequestId)> SeedAsync(decimal requestQty = 100m)
    {
        await using var context = fixture.CreateDbContext();
        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Customer");
        var obj = ConstructionObject.Create(company.Id, "Object", customer.Id);
        var brigade = Brigade.Create(company.Id, "Brigade");
        var ownerUser = User.Create("Owner", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Owner);
        var request = MaterialRequest.Create(company.Id, obj.Id, brigade.Id, ownerUser.Id, "Cement", "bags", requestQty, DateTimeOffset.UtcNow);
        request.Approve(ownerUser.Id, DateTimeOffset.UtcNow);
        request.MarkOrdered();

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(obj);
        context.Brigades.Add(brigade);
        context.Users.Add(ownerUser);
        context.MaterialRequests.Add(request);
        await context.SaveChangesAsync(CancellationToken.None);

        return (company.Id, obj.Id, ownerUser.Id, request.Id);
    }

    private static ICurrentUserService AsOwner(Guid companyId, Guid ownerId) =>
        new TestCurrentUserService { CompanyId = companyId, UserId = ownerId, Role = Role.Owner };

    [Theory]
    [InlineData(40, MaterialRequestStatus.PartiallyDelivered, false)]
    [InlineData(100, MaterialRequestStatus.Delivered, false)]
    [InlineData(150, MaterialRequestStatus.Delivered, true)]
    public async Task Delivery_auto_transitions_request_by_SumQty(decimal deliveredQty, MaterialRequestStatus expectedStatus, bool expectedOverDelivered)
    {
        var (companyId, objectId, ownerId, requestId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
            new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bags", deliveredQty, 12.5m, "ACME"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.UpdatedRequest.Should().NotBeNull();
        result.Value.UpdatedRequest!.Status.Should().Be(expectedStatus);
        result.Value.UpdatedRequest.QtyDelivered.Should().Be(deliveredQty);
        result.Value.UpdatedRequest.IsOverDelivered.Should().Be(expectedOverDelivered);
    }

    [Fact]
    public async Task Two_partial_deliveries_accumulate_to_Delivered()
    {
        var (companyId, objectId, ownerId, requestId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);

        await using (var context = fixture.CreateDbContext(owner))
        {
            var first = await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
                new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bags", 60m, 12.5m, "ACME"), CancellationToken.None);
            first.Value.UpdatedRequest!.Status.Should().Be(MaterialRequestStatus.PartiallyDelivered);
        }

        await using (var context = fixture.CreateDbContext(owner))
        {
            var second = await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
                new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bags", 40m, 12.5m, "ACME"), CancellationToken.None);
            second.Value.UpdatedRequest!.Status.Should().Be(MaterialRequestStatus.Delivered);
            second.Value.UpdatedRequest.QtyDelivered.Should().Be(100m);
        }
    }

    [Fact]
    public async Task ForceClose_from_PartiallyDelivered_moves_straight_to_Delivered()
    {
        var (companyId, objectId, ownerId, requestId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);

        await using (var context = fixture.CreateDbContext(owner))
            await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
                new CreateMaterialDeliveryCommand(objectId, requestId, "Cement", "bags", 40m, 12.5m, "ACME"), CancellationToken.None);

        await using var closeContext = fixture.CreateDbContext(owner);
        var close = await new ForceCloseMaterialRequestCommandHandler(closeContext, owner)
            .Handle(new ForceCloseMaterialRequestCommand(requestId, "недопоставка, договорились на меньшее"), CancellationToken.None);

        close.IsSuccess.Should().BeTrue();
        close.Value.Status.Should().Be(MaterialRequestStatus.Delivered);
    }

    [Fact]
    public async Task Delivery_without_a_request_link_succeeds_with_no_UpdatedRequest()
    {
        var (companyId, objectId, ownerId, _) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
            new CreateMaterialDeliveryCommand(objectId, null, "Bulk Sand", "m3", 20m, 5m, null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.UpdatedRequest.Should().BeNull();
    }

    [Fact]
    public async Task Delivery_against_a_request_for_a_different_object_is_rejected()
    {
        var (companyId, _, ownerId, requestId) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);

        await using var seedContext = fixture.CreateDbContext(owner);
        var otherCustomer = Customer.Create(companyId, "Other Customer");
        var otherObject = ConstructionObject.Create(companyId, "Other Object", otherCustomer.Id);
        seedContext.Customers.Add(otherCustomer);
        seedContext.ConstructionObjects.Add(otherObject);
        await seedContext.SaveChangesAsync(CancellationToken.None);

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
            new CreateMaterialDeliveryCommand(otherObject.Id, requestId, "Cement", "bags", 10m, 12.5m, null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("MATERIAL_REQUEST_NOT_FOUND");
    }

    [Fact]
    public async Task Delivery_against_a_Requested_status_request_fails_cleanly()
    {
        var (companyId, objectId, ownerId, _) = await SeedAsync();
        var owner = AsOwner(companyId, ownerId);

        await using var seedContext = fixture.CreateDbContext(owner);
        var otherBrigade = Brigade.Create(companyId, "Other Brigade");
        var notYetApproved = MaterialRequest.Create(companyId, objectId, otherBrigade.Id, ownerId, "Sand", "m3", 50m, DateTimeOffset.UtcNow);
        seedContext.Brigades.Add(otherBrigade);
        seedContext.MaterialRequests.Add(notYetApproved);
        await seedContext.SaveChangesAsync(CancellationToken.None);

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateMaterialDeliveryCommandHandler(context, owner).Handle(
            new CreateMaterialDeliveryCommand(objectId, notYetApproved.Id, "Sand", "m3", 10m, 5m, null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("MATERIAL_REQUEST_INVALID_TRANSITION");
    }
}

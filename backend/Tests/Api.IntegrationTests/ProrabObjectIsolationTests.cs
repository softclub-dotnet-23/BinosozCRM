using Application.Common.Interfaces;
using Application.Objects;
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

// MASTER §1.2 / §11.5 rule 3, Phase 1 Step 7 (Zone A half): a Prorab with
// zero ProrabObjectAssignment rows sees every object in the company (the
// stated default — one prorab needs no setup); the moment they have even
// one assignment, it becomes a strict allow-list. Owner is never filtered.
// Wrong company/no assignment reads as 404 (PRORAB_NOT_ASSIGNED_TO_OBJECT),
// not 403, per §11.5.
[Collection(PostgresCollection.Name)]
public sealed class ProrabObjectIsolationTests(PostgresFixture fixture)
{
    private async Task<(Guid CompanyId, Guid ObjectAId, Guid ObjectBId, Guid ProrabUserId, Guid OwnerUserId)> SeedAsync()
    {
        await using var context = fixture.CreateDbContext();

        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        var customer = Customer.Create(company.Id, "Test Customer");
        var objectA = ConstructionObject.Create(company.Id, "Object A", customer.Id);
        var objectB = ConstructionObject.Create(company.Id, "Object B", customer.Id);
        var prorab = User.Create("Prorab Test", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Prorab);
        var owner = User.Create("Owner Test", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Owner);

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.AddRange(objectA, objectB);
        context.Users.AddRange(prorab, owner);
        await context.SaveChangesAsync(CancellationToken.None);

        return (company.Id, objectA.Id, objectB.Id, prorab.Id, owner.Id);
    }

    [Fact]
    public async Task Prorab_with_no_assignments_sees_all_objects()
    {
        var (companyId, objectAId, objectBId, prorabUserId, _) = await SeedAsync();

        var currentUser = new TestCurrentUserService { CompanyId = companyId, UserId = prorabUserId, Role = Domain.Enums.Role.Prorab };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new ListConstructionObjectsQueryHandler(context, currentUser);

        var result = await handler.Handle(new ListConstructionObjectsQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Select(o => o.Id).Should().BeEquivalentTo([objectAId, objectBId]);
    }

    [Fact]
    public async Task Prorab_with_one_assignment_sees_only_that_object()
    {
        var (companyId, objectAId, objectBId, prorabUserId, ownerUserId) = await SeedAsync();

        await using (var seedContext = fixture.CreateDbContext())
        {
            seedContext.ProrabObjectAssignments.Add(
                ProrabObjectAssignment.Create(companyId, prorabUserId, objectAId, DateTimeOffset.UtcNow, ownerUserId));
            await seedContext.SaveChangesAsync(CancellationToken.None);
        }

        var currentUser = new TestCurrentUserService { CompanyId = companyId, UserId = prorabUserId, Role = Domain.Enums.Role.Prorab };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new ListConstructionObjectsQueryHandler(context, currentUser);

        var result = await handler.Handle(new ListConstructionObjectsQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Select(o => o.Id).Should().BeEquivalentTo([objectAId]);
        result.Value.Items.Select(o => o.Id).Should().NotContain(objectBId);
    }

    [Fact]
    public async Task Prorab_assigned_to_object_can_read_it_directly()
    {
        var (companyId, objectAId, _, prorabUserId, ownerUserId) = await SeedAsync();

        await using (var seedContext = fixture.CreateDbContext())
        {
            seedContext.ProrabObjectAssignments.Add(
                ProrabObjectAssignment.Create(companyId, prorabUserId, objectAId, DateTimeOffset.UtcNow, ownerUserId));
            await seedContext.SaveChangesAsync(CancellationToken.None);
        }

        var currentUser = new TestCurrentUserService { CompanyId = companyId, UserId = prorabUserId, Role = Domain.Enums.Role.Prorab };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new GetConstructionObjectQueryHandler(context, currentUser);

        var result = await handler.Handle(new GetConstructionObjectQuery(objectAId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Prorab_assigned_elsewhere_gets_404_not_403_reading_unassigned_object()
    {
        var (companyId, objectAId, objectBId, prorabUserId, ownerUserId) = await SeedAsync();

        await using (var seedContext = fixture.CreateDbContext())
        {
            // Assigned to A only — B exists, belongs to the same company, but isn't theirs.
            seedContext.ProrabObjectAssignments.Add(
                ProrabObjectAssignment.Create(companyId, prorabUserId, objectAId, DateTimeOffset.UtcNow, ownerUserId));
            await seedContext.SaveChangesAsync(CancellationToken.None);
        }

        var currentUser = new TestCurrentUserService { CompanyId = companyId, UserId = prorabUserId, Role = Domain.Enums.Role.Prorab };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new GetConstructionObjectQueryHandler(context, currentUser);

        var result = await handler.Handle(new GetConstructionObjectQuery(objectBId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
    }

    [Fact]
    public async Task Owner_sees_all_objects_regardless_of_any_prorab_assignments()
    {
        var (companyId, objectAId, objectBId, prorabUserId, ownerUserId) = await SeedAsync();

        await using (var seedContext = fixture.CreateDbContext())
        {
            // A different prorab is strictly assigned — must not affect Owner's view.
            seedContext.ProrabObjectAssignments.Add(
                ProrabObjectAssignment.Create(companyId, prorabUserId, objectAId, DateTimeOffset.UtcNow, ownerUserId));
            await seedContext.SaveChangesAsync(CancellationToken.None);
        }

        var currentUser = new TestCurrentUserService { CompanyId = companyId, UserId = ownerUserId, Role = Domain.Enums.Role.Owner };
        await using var context = fixture.CreateDbContext(currentUser);
        var handler = new ListConstructionObjectsQueryHandler(context, currentUser);

        var result = await handler.Handle(new ListConstructionObjectsQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Select(o => o.Id).Should().BeEquivalentTo([objectAId, objectBId]);
    }
}

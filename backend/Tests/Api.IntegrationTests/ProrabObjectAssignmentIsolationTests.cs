using Application.Customers;
using Application.Objects;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §1.2/§11.5 rule 3: a Prorab with zero ProrabObjectAssignment rows
// sees every object in the company (no-setup default); one row switches to
// a strict allow-list. Isolation failures read as PRORAB_NOT_ASSIGNED_TO_OBJECT
// (404, closed model — MASTER §9), not 403.
[Collection(PostgresCollection.Name)]
public sealed class ProrabObjectAssignmentIsolationTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid ProrabUserId, Guid ObjectAId, Guid ObjectBId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);

        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"Isolation Test Co {companyId}");
        var prorabUser = User.Create("Test Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
        context.Companies.Add(company);
        context.Users.Add(prorabUser);
        await context.SaveChangesAsync(CancellationToken.None);

        var customerResult = await new CreateCustomerCommandHandler(context, owner)
            .Handle(new CreateCustomerCommand("Acme", null, null), CancellationToken.None);

        var objectA = await new CreateConstructionObjectCommandHandler(context, owner)
            .Handle(new CreateConstructionObjectCommand("Object A", customerResult.Value.Id, null, null, null, null), CancellationToken.None);
        var objectB = await new CreateConstructionObjectCommandHandler(context, owner)
            .Handle(new CreateConstructionObjectCommand("Object B", customerResult.Value.Id, null, null, null, null), CancellationToken.None);

        return (owner, prorabUser.Id, objectA.Value.Id, objectB.Value.Id);
    }

    [Fact]
    public async Task Prorab_with_no_assignments_sees_every_object()
    {
        var (owner, prorabUserId, _, _) = await SeedAsync();
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        await using var context = fixture.CreateDbContext(prorab);
        var result = await new ListConstructionObjectsQueryHandler(context, prorab)
            .Handle(new ListConstructionObjectsQuery(1, 20), CancellationToken.None);

        result.Value.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task Prorab_with_one_assignment_sees_only_that_object()
    {
        var (owner, prorabUserId, objectAId, objectBId) = await SeedAsync();
        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, prorabUserId, Role.Prorab);

        await using (var assignContext = fixture.CreateDbContext(owner))
        {
            var assign = await new AssignProrabCommandHandler(assignContext, owner)
                .Handle(new AssignProrabCommand(objectAId, prorabUserId), CancellationToken.None);
            assign.IsSuccess.Should().BeTrue();
        }

        await using var context = fixture.CreateDbContext(prorab);
        var listResult = await new ListConstructionObjectsQueryHandler(context, prorab)
            .Handle(new ListConstructionObjectsQuery(1, 20), CancellationToken.None);
        listResult.Value.Items.Should().ContainSingle(o => o.Id == objectAId);

        var getAssigned = await new GetConstructionObjectQueryHandler(context, prorab)
            .Handle(new GetConstructionObjectQuery(objectAId), CancellationToken.None);
        getAssigned.IsSuccess.Should().BeTrue();

        var getUnassigned = await new GetConstructionObjectQueryHandler(context, prorab)
            .Handle(new GetConstructionObjectQuery(objectBId), CancellationToken.None);
        getUnassigned.IsSuccess.Should().BeFalse();
        getUnassigned.Error.Code.Should().Be("PRORAB_NOT_ASSIGNED_TO_OBJECT");
    }

    [Fact]
    public async Task Owner_sees_every_object_regardless_of_assignments()
    {
        var (owner, prorabUserId, objectAId, _) = await SeedAsync();

        await using (var assignContext = fixture.CreateDbContext(owner))
        {
            await new AssignProrabCommandHandler(assignContext, owner)
                .Handle(new AssignProrabCommand(objectAId, prorabUserId), CancellationToken.None);
        }

        await using var context = fixture.CreateDbContext(owner);
        var result = await new ListConstructionObjectsQueryHandler(context, owner)
            .Handle(new ListConstructionObjectsQuery(1, 20), CancellationToken.None);

        result.Value.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task Duplicate_assignment_is_rejected()
    {
        var (owner, prorabUserId, objectAId, _) = await SeedAsync();

        await using var context = fixture.CreateDbContext(owner);
        var first = await new AssignProrabCommandHandler(context, owner)
            .Handle(new AssignProrabCommand(objectAId, prorabUserId), CancellationToken.None);
        first.IsSuccess.Should().BeTrue();

        var duplicate = await new AssignProrabCommandHandler(context, owner)
            .Handle(new AssignProrabCommand(objectAId, prorabUserId), CancellationToken.None);
        duplicate.IsSuccess.Should().BeFalse();
        duplicate.Error.Code.Should().Be("PRORAB_ALREADY_ASSIGNED");
    }
}

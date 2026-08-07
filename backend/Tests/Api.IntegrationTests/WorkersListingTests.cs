using Application.Workers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// Frontend-integration Workers module: GET /workers (company-wide, unlike the brigade-scoped
// ListBrigadeWorkersQuery) and GET /brigades/mine/workers (the only Brigadir-reachable roster
// endpoint on WorkersController — the other two are Owner/Prorab/Accountant only).
[Collection(PostgresCollection.Name)]
public sealed class WorkersListingTests(PostgresFixture fixture)
{
    [Fact]
    public async Task ListWorkers_is_company_wide_and_masks_PayRate_for_Prorab_but_not_Owner()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, role: Role.Owner);
        Guid brigadeAId;
        Guid brigadeBId;

        await using (var context = fixture.CreateDbContext(owner))
        {
            context.Companies.Add(Company.Create(companyId, $"Workers Listing Co {companyId}"));

            var brigadeA = Brigade.Create(companyId, "Brigade A");
            var brigadeB = Brigade.Create(companyId, "Brigade B");
            context.Brigades.AddRange(brigadeA, brigadeB);
            brigadeAId = brigadeA.Id;
            brigadeBId = brigadeB.Id;

            var birthDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30));
            var hireDate = DateOnly.FromDateTime(DateTime.UtcNow);
            context.Workers.Add(Worker.Create(companyId, brigadeAId, "Worker A", "+992900000001", birthDate, PayRateType.Hourly, 50m, hireDate));
            context.Workers.Add(Worker.Create(companyId, brigadeBId, "Worker B", "+992900000002", birthDate, PayRateType.Hourly, 60m, hireDate));
            await context.SaveChangesAsync(CancellationToken.None);
        }

        await using var ownerContext = fixture.CreateDbContext(owner);
        var ownerResult = await new ListWorkersQueryHandler(ownerContext, owner).Handle(new ListWorkersQuery(1, 20), CancellationToken.None);
        ownerResult.IsSuccess.Should().BeTrue();
        ownerResult.Value.Items.Should().HaveCount(2);
        ownerResult.Value.Items.Should().OnlyContain(w => w.PayRate != null);

        var prorab = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Prorab);
        await using var prorabContext = fixture.CreateDbContext(prorab);
        var prorabResult = await new ListWorkersQueryHandler(prorabContext, prorab).Handle(new ListWorkersQuery(1, 20), CancellationToken.None);
        prorabResult.IsSuccess.Should().BeTrue();
        prorabResult.Value.Items.Should().HaveCount(2);
        prorabResult.Value.Items.Should().OnlyContain(w => w.PayRate == null);

        await using var scopedContext = fixture.CreateDbContext(owner);
        var scopedResult = await new ListWorkersQueryHandler(scopedContext, owner)
            .Handle(new ListWorkersQuery(1, 20, BrigadeId: brigadeAId), CancellationToken.None);
        scopedResult.Value.Items.Should().ContainSingle().Which.FullName.Should().Be("Worker A");
    }

    [Fact]
    public async Task ListMyBrigadeWorkers_returns_only_the_callers_own_active_brigade_mates()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, role: Role.Owner);
        Guid brigadirUserId;

        await using (var context = fixture.CreateDbContext(owner))
        {
            context.Companies.Add(Company.Create(companyId, $"Mine Listing Co {companyId}"));

            var brigadirUser = User.Create(companyId, "Brigadir User", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
            context.Users.Add(brigadirUser);
            brigadirUserId = brigadirUser.Id;

            var myBrigade = Brigade.Create(companyId, "My Brigade");
            var otherBrigade = Brigade.Create(companyId, "Other Brigade");
            context.Brigades.AddRange(myBrigade, otherBrigade);
            await context.SaveChangesAsync(CancellationToken.None);

            var birthDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30));
            var hireDate = DateOnly.FromDateTime(DateTime.UtcNow);
            context.Workers.Add(Worker.Create(companyId, myBrigade.Id, "Me, the Brigadir", "+992900000010", birthDate, PayRateType.Hourly, 40m, hireDate, brigadirUser.Id));
            context.Workers.Add(Worker.Create(companyId, myBrigade.Id, "My Teammate", "+992900000011", birthDate, PayRateType.Hourly, 40m, hireDate));

            var terminated = Worker.Create(companyId, myBrigade.Id, "Terminated Teammate", "+992900000012", birthDate, PayRateType.Hourly, 40m, hireDate);
            terminated.Terminate(hireDate);
            context.Workers.Add(terminated);

            context.Workers.Add(Worker.Create(companyId, otherBrigade.Id, "Someone Else's Worker", "+992900000013", birthDate, PayRateType.Hourly, 40m, hireDate));
            await context.SaveChangesAsync(CancellationToken.None);
        }

        var brigadir = new FixedCurrentUserService(companyId, brigadirUserId, Role.Brigadir);
        await using var context2 = fixture.CreateDbContext(brigadir);
        var result = await new ListMyBrigadeWorkersQueryHandler(context2, brigadir).Handle(new ListMyBrigadeWorkersQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Select(w => w.FullName).Should().BeEquivalentTo(["Me, the Brigadir", "My Teammate"]);
    }

    [Fact]
    public async Task ListMyBrigadeWorkers_with_no_linked_Worker_row_returns_WORKER_NOT_FOUND()
    {
        var companyId = Guid.NewGuid();
        var brigadir = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await new ListMyBrigadeWorkersQueryHandler(context, brigadir).Handle(new ListMyBrigadeWorkersQuery(1, 20), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_NOT_FOUND");
    }
}

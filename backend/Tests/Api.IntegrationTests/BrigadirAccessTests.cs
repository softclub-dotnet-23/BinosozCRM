using Application.Brigades;
using Application.Common.Interfaces;
using Application.Workers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class BrigadirAccessTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Brigadir_gets_only_workers_from_own_brigade()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var setupContext = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, "Brigadir Access Co");
        var brigade = Brigade.Create(companyId, "Brigade A");
        var otherBrigade = Brigade.Create(companyId, "Brigade B");
        var brigadirUser = User.Create(companyId, "Test Brigadir", "+992700000001", "hash", Role.Brigadir);
        var otherWorker = Worker.Create(companyId, otherBrigade.Id, "Other Worker", "+992700000002", new DateOnly(1990, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1));
        var ownWorker = Worker.Create(companyId, brigade.Id, "Own Worker", "+992700000003", new DateOnly(1990, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1), userId: brigadirUser.Id);

        setupContext.Companies.Add(company);
        setupContext.Brigades.AddRange(brigade, otherBrigade);
        setupContext.Users.Add(brigadirUser);
        setupContext.Workers.AddRange(otherWorker, ownWorker);
        await setupContext.SaveChangesAsync(CancellationToken.None);

        var brigadir = new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await new ListBrigadeWorkersQueryHandler(context, brigadir)
            .Handle(new ListBrigadeWorkersQuery(brigade.Id, 1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().ContainSingle(w => w.FullName == "Own Worker");
        result.Value.Items.Should().NotContain(w => w.FullName == "Other Worker");
    }

    [Fact]
    public async Task Brigadir_cannot_read_workers_from_a_different_brigade()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var setupContext = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, "Brigadir Access Co");
        var brigade = Brigade.Create(companyId, "Brigade A");
        var otherBrigade = Brigade.Create(companyId, "Brigade B");
        var brigadirUser = User.Create(companyId, "Test Brigadir", "+992700000004", "hash", Role.Brigadir);
        var ownWorker = Worker.Create(companyId, brigade.Id, "Own Worker", "+992700000005", new DateOnly(1990, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1), userId: brigadirUser.Id);

        setupContext.Companies.Add(company);
        setupContext.Brigades.AddRange(brigade, otherBrigade);
        setupContext.Users.Add(brigadirUser);
        setupContext.Workers.Add(ownWorker);
        await setupContext.SaveChangesAsync(CancellationToken.None);

        var brigadir = new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await new ListBrigadeWorkersQueryHandler(context, brigadir)
            .Handle(new ListBrigadeWorkersQuery(otherBrigade.Id, 1, 20), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BRIGADE_NOT_FOUND");
    }

    [Fact]
    public async Task Brigadir_without_linked_brigade_gets_an_empty_result_for_own_brigade_lookup()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var setupContext = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, "Brigadir Access Co");
        var brigade = Brigade.Create(companyId, "Brigade A");
        var brigadirUser = User.Create(companyId, "Unlinked Brigadir", "+992700000006", "hash", Role.Brigadir);

        setupContext.Companies.Add(company);
        setupContext.Brigades.Add(brigade);
        setupContext.Users.Add(brigadirUser);
        await setupContext.SaveChangesAsync(CancellationToken.None);

        var brigadir = new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await new ListBrigadeWorkersQueryHandler(context, brigadir)
            .Handle(new ListBrigadeWorkersQuery(brigade.Id, 1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task Brigadir_can_resolve_their_own_brigade_via_mine_endpoint_query()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var setupContext = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, "Brigadir Access Co");
        var brigade = Brigade.Create(companyId, "Brigade A");
        var brigadirUser = User.Create(companyId, "Team Brigadir", "+992700000007", "hash", Role.Brigadir);
        var worker = Worker.Create(companyId, brigade.Id, "Own Worker", "+992700000008", new DateOnly(1990, 1, 1), PayRateType.Hourly, 50m, new DateOnly(2020, 1, 1), userId: brigadirUser.Id);

        setupContext.Companies.Add(company);
        setupContext.Brigades.Add(brigade);
        setupContext.Users.Add(brigadirUser);
        setupContext.Workers.Add(worker);
        await setupContext.SaveChangesAsync(CancellationToken.None);

        var brigadir = new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await new GetMyBrigadeQueryHandler(context, brigadir)
            .Handle(new GetMyBrigadeQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(brigade.Id);
        result.Value.Name.Should().Be("Brigade A");
    }
}

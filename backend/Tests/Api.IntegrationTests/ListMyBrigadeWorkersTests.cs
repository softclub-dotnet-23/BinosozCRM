using Application.Workers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// GET /brigades/mine/workers — the only Brigadir-reachable roster endpoint on
// WorkersController (both other actions are Owner/Prorab/Accountant only).
[Collection(PostgresCollection.Name)]
public sealed class ListMyBrigadeWorkersTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Brigadir_linked_to_a_Worker_row_sees_only_their_own_active_brigade_mates()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, null, Role.Owner);
        await using var seedContext = fixture.CreateDbContext(owner);

        seedContext.Companies.Add(Company.Create(companyId, $"Mine Test Co {companyId}"));
        var brigadirUser = User.Create("Brigadir User", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Brigadir);
        seedContext.Users.Add(brigadirUser);

        var myBrigade = Brigade.Create(companyId, "My Brigade");
        var otherBrigade = Brigade.Create(companyId, "Other Brigade");
        seedContext.Brigades.AddRange(myBrigade, otherBrigade);
        await seedContext.SaveChangesAsync(CancellationToken.None);

        var hireDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var birthDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30));
        seedContext.Workers.Add(Worker.Create(companyId, myBrigade.Id, "Me, the Brigadir", "+992900000010", birthDate, PayRateType.Hourly, 40m, hireDate, brigadirUser.Id));
        seedContext.Workers.Add(Worker.Create(companyId, myBrigade.Id, "My Teammate", "+992900000011", birthDate, PayRateType.Hourly, 40m, hireDate));
        var terminated = Worker.Create(companyId, myBrigade.Id, "Terminated Teammate", "+992900000012", birthDate, PayRateType.Hourly, 40m, hireDate);
        terminated.Terminate(hireDate);
        seedContext.Workers.Add(terminated);
        seedContext.Workers.Add(Worker.Create(companyId, otherBrigade.Id, "Someone Else's Worker", "+992900000013", birthDate, PayRateType.Hourly, 40m, hireDate));
        await seedContext.SaveChangesAsync(CancellationToken.None);

        var brigadir = new FixedCurrentUserService(companyId, brigadirUser.Id, Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);
        var result = await new ListMyBrigadeWorkersQueryHandler(context, brigadir).Handle(new ListMyBrigadeWorkersQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Select(w => w.FullName).Should().BeEquivalentTo(["Me, the Brigadir", "My Teammate"]);
    }

    [Fact]
    public async Task Caller_with_no_linked_Worker_row_gets_WORKER_NOT_FOUND()
    {
        var companyId = Guid.NewGuid();
        var brigadir = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Brigadir);
        await using var context = fixture.CreateDbContext(brigadir);

        var result = await new ListMyBrigadeWorkersQueryHandler(context, brigadir).Handle(new ListMyBrigadeWorkersQuery(1, 20), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORKER_NOT_FOUND");
    }
}

using Application.Brigades;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// Frontend integration pass: PUT /brigades/{id}/active — the thin command/endpoint layer that
// was missing over Brigade.Activate()/Deactivate() (both already existed on the domain entity).
[Collection(PostgresCollection.Name)]
public sealed class BrigadeActivationTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid BrigadeId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        context.Companies.Add(Company.Create(companyId, $"Brigade Activation Co {companyId}"));
        var brigade = Brigade.Create(companyId, "Brigade 1");
        context.Brigades.Add(brigade);
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner, brigade.Id);
    }

    [Fact]
    public async Task Deactivate_then_activate_round_trips_IsActive()
    {
        var (owner, brigadeId) = await SeedAsync();

        await using (var deactivateContext = fixture.CreateDbContext(owner))
        {
            var deactivated = await new SetBrigadeActiveCommandHandler(deactivateContext)
                .Handle(new SetBrigadeActiveCommand(brigadeId, false), CancellationToken.None);
            deactivated.IsSuccess.Should().BeTrue();
            deactivated.Value.IsActive.Should().BeFalse();
        }

        await using var activateContext = fixture.CreateDbContext(owner);
        var activated = await new SetBrigadeActiveCommandHandler(activateContext)
            .Handle(new SetBrigadeActiveCommand(brigadeId, true), CancellationToken.None);
        activated.IsSuccess.Should().BeTrue();
        activated.Value.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task Unknown_brigade_returns_BRIGADE_NOT_FOUND()
    {
        var (owner, _) = await SeedAsync();
        await using var context = fixture.CreateDbContext(owner);

        var result = await new SetBrigadeActiveCommandHandler(context)
            .Handle(new SetBrigadeActiveCommand(Guid.NewGuid(), false), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BRIGADE_NOT_FOUND");
    }
}

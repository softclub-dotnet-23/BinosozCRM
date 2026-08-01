using Application.Brigades;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// Frontend-integration Brigades module (2026-07-31): Brigade.Activate()/
// Deactivate() (Domain) sat unused — no endpoint exposed them despite
// MASTER §12 listing Brigade as Owner/Prorab:CRU.
[Collection(PostgresCollection.Name)]
public sealed class BrigadeActivationTests(PostgresFixture fixture)
{
    private async Task<(Guid CompanyId, Brigade Brigade)> SeedBrigadeAsync()
    {
        var companyId = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        context.Companies.Add(Company.Create(companyId, $"Brigade Test Co {companyId}"));

        var brigade = Brigade.Create(companyId, "Test Brigade");
        context.Brigades.Add(brigade);
        await context.SaveChangesAsync(CancellationToken.None);

        return (companyId, brigade);
    }

    [Fact]
    public async Task Deactivate_then_activate_round_trips_IsActive()
    {
        var (companyId, brigade) = await SeedBrigadeAsync();
        var caller = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);

        await using (var context = fixture.CreateDbContext(caller))
        {
            var result = await new DeactivateBrigadeCommandHandler(context).Handle(new DeactivateBrigadeCommand(brigade.Id), CancellationToken.None);
            result.IsSuccess.Should().BeTrue();
            result.Value.IsActive.Should().BeFalse();
        }

        await using var reactivateContext = fixture.CreateDbContext(caller);
        var activateResult = await new ActivateBrigadeCommandHandler(reactivateContext).Handle(new ActivateBrigadeCommand(brigade.Id), CancellationToken.None);
        activateResult.IsSuccess.Should().BeTrue();
        activateResult.Value.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task Deactivating_an_unknown_brigade_returns_not_found()
    {
        var caller = new FixedCurrentUserService(Guid.NewGuid(), Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(caller);

        var result = await new DeactivateBrigadeCommandHandler(context).Handle(new DeactivateBrigadeCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BRIGADE_NOT_FOUND");
    }
}

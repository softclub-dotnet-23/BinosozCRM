using Application.Common.Options;
using Application.Seed;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.IntegrationTests;

// MASTER §5.27: SeedData runs at every startup and must be a silent no-op on
// an already-seeded database — otherwise every restart would try to
// re-create the Company/Owners. One test method, deliberately: SeedDataService
// gates owner-creation on "does *any* Owner exist in the database?", not
// per-company — so two [Fact]s each calling SeedAsync with different options
// would race on that global gate depending on xUnit's execution order. Doing
// both assertions (first-run creates, second-run no-ops) against the same
// seed options in one test avoids that hazard entirely.
[Collection(PostgresCollection.Name)]
public sealed class SeedDataServiceTests(PostgresFixture fixture)
{
    [Fact]
    public async Task First_run_seeds_and_second_run_is_a_silent_no_op()
    {
        var companyId = Guid.NewGuid();
        var seedOptions = Options.Create(new SeedOptions
        {
            Company = new SeedCompanyOptions { Id = companyId, Name = $"Seed Test Co {companyId}" },
            Owners =
            [
                new SeedOwnerOptions { Phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}", FullName = "Seed Owner 1" },
                new SeedOwnerOptions { Phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}", FullName = "Seed Owner 2" },
                new SeedOwnerOptions { Phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}", FullName = "Seed Owner 3" }
            ]
        });
        var passwordHasher = new Argon2PasswordHasher();
        var seededPhones = seedOptions.Value.Owners.Select(o => o.Phone).ToList();

        await using (var firstRun = fixture.CreateDbContext())
            await new SeedDataService(firstRun, passwordHasher, seedOptions).SeedAsync(CancellationToken.None);

        int companyCountAfterFirstRun, ownerCountAfterFirstRun;
        await using (var verify = fixture.CreateDbContext())
        {
            companyCountAfterFirstRun = await verify.Companies.CountAsync(c => c.Id == companyId);
            ownerCountAfterFirstRun = await verify.Users.CountAsync(u => seededPhones.Contains(u.Phone));
        }

        companyCountAfterFirstRun.Should().Be(1);
        ownerCountAfterFirstRun.Should().Be(seedOptions.Value.Owners.Count);

        await using (var verifyOwners = fixture.CreateDbContext())
        {
            var owners = await verifyOwners.Users.Where(u => seededPhones.Contains(u.Phone)).ToListAsync();
            owners.Should().OnlyContain(u => u.Role == Role.Owner && u.ForcePasswordChange);
        }

        // Second run, same options — MASTER §5.27 step 3: "already there? exit
        // silently, touch nothing."
        await using (var secondRun = fixture.CreateDbContext())
            await new SeedDataService(secondRun, passwordHasher, seedOptions).SeedAsync(CancellationToken.None);

        await using var verifyAgain = fixture.CreateDbContext();
        var companyCountAfterSecondRun = await verifyAgain.Companies.CountAsync(c => c.Id == companyId);
        var ownerCountAfterSecondRun = await verifyAgain.Users.CountAsync(u => seededPhones.Contains(u.Phone));

        companyCountAfterSecondRun.Should().Be(companyCountAfterFirstRun);
        ownerCountAfterSecondRun.Should().Be(ownerCountAfterFirstRun);
    }
}

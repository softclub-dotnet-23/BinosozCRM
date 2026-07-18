using Application.Common.Interfaces;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace Api.IntegrationTests;

// Handlers under test run with no authenticated context (login/refresh/seed
// all happen before a JWT exists), so CompanyId/UserId/Role are always null —
// same as ICurrentUserService.CompanyId falling back to Guid.Empty in
// ApplicationDbContext's query filters (see its own comment on that).
public sealed class NullCurrentUserService : ICurrentUserService
{
    public Guid? UserId => null;
    public Guid? CompanyId => null;
    public Role? Role => null;
}

// For tests that need a real, authenticated-shaped caller — CompanyId always
// set (the CompanyId global query filter needs it to see anything), UserId/
// Role optional depending on what the handler under test actually reads.
public sealed class FixedCurrentUserService(Guid companyId, Guid? userId = null, Role? role = null) : ICurrentUserService
{
    public Guid? UserId => userId;
    public Guid? CompanyId => companyId;
    public Role? Role => role;
}

// One real Postgres container (Testcontainers, MASTER §2/§3 — no InMemory
// provider) for the whole test assembly. Migrated once via the InitialCreate
// migration (backend/Infrastructure/Migrations) so tests exercise the actual
// schema MigrateAsync() applies in production, not a hand-built one.
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine").Build();

    public const string SeedOwner1Password = "test-seed-owner-1-password";
    public const string SeedOwner2Password = "test-seed-owner-2-password";
    public const string SeedOwner3Password = "test-seed-owner-3-password";

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        // Fixed values, set once here — safe even if multiple test classes'
        // InitializeAsync race, since every writer sets the same value.
        Environment.SetEnvironmentVariable("SEED_OWNER_1_PASSWORD", SeedOwner1Password);
        Environment.SetEnvironmentVariable("SEED_OWNER_2_PASSWORD", SeedOwner2Password);
        Environment.SetEnvironmentVariable("SEED_OWNER_3_PASSWORD", SeedOwner3Password);

        await using var context = CreateDbContext();
        await context.Database.MigrateAsync();
    }

    public ApplicationDbContext CreateDbContext() => CreateDbContext(new NullCurrentUserService());

    public ApplicationDbContext CreateDbContext(ICurrentUserService currentUser)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        return new ApplicationDbContext(options, currentUser);
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}

[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "Postgres";
}

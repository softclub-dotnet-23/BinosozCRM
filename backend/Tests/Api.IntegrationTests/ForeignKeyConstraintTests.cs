using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Api.IntegrationTests;

// Phase 0 Step 12: none of the 26 entity configurations declared a real FK
// before this step — every Guid/Guid? "reference" column was enforced only in
// application code, not by Postgres. Not exhaustive over all ~73 relationships
// (that's what code review of the migration is for) — these are representative
// checks that the constraints are real and enforced, not just present in the
// migration file and silently no-op.
[Collection(PostgresCollection.Name)]
public sealed class ForeignKeyConstraintTests(PostgresFixture fixture)
{
    private static bool IsForeignKeyViolation(Exception ex) =>
        ex is DbUpdateException { InnerException: PostgresException { SqlState: "23503" } };

    [Fact]
    public async Task Required_fk_rejects_a_nonexistent_parent()
    {
        await using var context = fixture.CreateDbContext();

        // Both CompanyId and BrigadeId point at rows that don't exist.
        var worker = Worker.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Nobody",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1),
            PayRateType.Hourly,
            50m,
            new DateOnly(2020, 1, 1));

        context.Workers.Add(worker);

        var act = () => context.SaveChangesAsync(CancellationToken.None);

        var exception = await act.Should().ThrowAsync<DbUpdateException>();
        IsForeignKeyViolation(exception.Which).Should().BeTrue();
    }

    [Fact]
    public async Task Nullable_fk_rejects_a_nonexistent_parent_when_set()
    {
        await using var context = fixture.CreateDbContext();

        var company = Company.Create(Guid.NewGuid(), $"FK Test Co {Guid.NewGuid()}");
        var brigade = Brigade.Create(company.Id, "Test Brigade");
        context.Companies.Add(company);
        context.Brigades.Add(brigade);
        await context.SaveChangesAsync(CancellationToken.None);

        // CompanyId/BrigadeId are valid; UserId (nullable) points at a User that
        // doesn't exist.
        var worker = Worker.Create(
            company.Id,
            brigade.Id,
            "Somebody",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1),
            PayRateType.Hourly,
            50m,
            new DateOnly(2020, 1, 1),
            userId: Guid.NewGuid());

        context.Workers.Add(worker);

        var act = () => context.SaveChangesAsync(CancellationToken.None);

        var exception = await act.Should().ThrowAsync<DbUpdateException>();
        IsForeignKeyViolation(exception.Which).Should().BeTrue();
    }

    [Fact]
    public async Task Valid_references_are_not_blocked()
    {
        await using var context = fixture.CreateDbContext();

        var company = Company.Create(Guid.NewGuid(), $"FK Test Co {Guid.NewGuid()}");
        var brigade = Brigade.Create(company.Id, "Test Brigade");
        context.Companies.Add(company);
        context.Brigades.Add(brigade);
        await context.SaveChangesAsync(CancellationToken.None);

        var worker = Worker.Create(
            company.Id,
            brigade.Id,
            "Legit Worker",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1),
            PayRateType.Hourly,
            50m,
            new DateOnly(2020, 1, 1));

        context.Workers.Add(worker);

        var act = () => context.SaveChangesAsync(CancellationToken.None);

        await act.Should().NotThrowAsync();
    }
}

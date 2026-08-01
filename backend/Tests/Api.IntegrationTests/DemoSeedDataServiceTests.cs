using Application.Common.Options;
using Application.Common.Security;
using Application.Seed;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Infrastructure.Persistence;
using Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.IntegrationTests;

// MASTER §5.27's own procedure only ever creates Company + Owners.
// DemoSeedDataService is a separate, Development-only, idempotent seed on
// top of that — same "already there?" gate shape as SeedDataServiceTests,
// just gated by Seed:DemoDataEnabled instead of by "does an Owner exist".
[Collection(PostgresCollection.Name)]
public sealed class DemoSeedDataServiceTests(PostgresFixture fixture)
{
    private static readonly string[] ExpectedObjectNames =
    [
        "Медицинская клиника «Шифо»",
        "Бизнес-центр «Ватан»",
        "Жилой комплекс «Сомони»",
        "Дорога Истиклол",
        "Школа №15",
        "Складской комплекс"
    ];

    private static async Task<(string ConnectionString, Guid CompanyId)> SeedBaseAsync(PostgresFixture fixture)
    {
        var companyId = Guid.NewGuid();
        var connectionString = await fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var seedOptions = Options.Create(new SeedOptions
        {
            Company = new SeedCompanyOptions { Id = companyId, Name = $"Demo Seed Test Co {companyId}" },
            Owners =
            [
                new SeedOwnerOptions { Phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}", FullName = "Seed Owner 1" },
                new SeedOwnerOptions { Phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}", FullName = "Seed Owner 2" },
                new SeedOwnerOptions { Phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}", FullName = "Seed Owner 3" }
            ]
        });

        await using var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService());
        await new SeedDataService(context, new Argon2PasswordHasher(), seedOptions).SeedAsync(CancellationToken.None);

        return (connectionString, companyId);
    }

    private static DemoSeedDataService CreateDemoSeedDataService(ApplicationDbContext context, Guid companyId, bool demoDataEnabled)
    {
        var seedOptions = Options.Create(new SeedOptions
        {
            Company = new SeedCompanyOptions { Id = companyId, Name = "unused" },
            DemoDataEnabled = demoDataEnabled
        });
        var businessTime = new BusinessTimeProvider(
            Options.Create(new BusinessTimeOptions { TimeZoneId = BusinessTimeOptions.AsiaDushanbeTimeZoneId }),
            TimeProvider.System);

        return new DemoSeedDataService(context, new Argon2PasswordHasher(), businessTime, seedOptions);
    }

    [Fact]
    public async Task Demo_seed_is_a_no_op_when_disabled()
    {
        var (connectionString, companyId) = await SeedBaseAsync(fixture);

        // Default SeedOptions.DemoDataEnabled is false — this mirrors what
        // happens if the flag is simply never set.
        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: false).SeedAsync(CancellationToken.None);

        await using var verify = fixture.CreateDbContext(connectionString, new NullCurrentUserService());
        (await verify.Brigades.IgnoreQueryFilters().CountAsync(b => b.CompanyId == companyId)).Should().Be(0);
        (await verify.Workers.IgnoreQueryFilters().CountAsync(w => w.CompanyId == companyId)).Should().Be(0);
        (await verify.WorkOrders.IgnoreQueryFilters().CountAsync(o => o.CompanyId == companyId)).Should().Be(0);
    }

    [Fact]
    public async Task Demo_seed_creates_full_dataset_when_enabled()
    {
        var (connectionString, companyId) = await SeedBaseAsync(fixture);

        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: true).SeedAsync(CancellationToken.None);

        await using var verify = fixture.CreateDbContext(connectionString, new NullCurrentUserService());

        (await verify.Brigades.IgnoreQueryFilters().CountAsync(b => b.CompanyId == companyId)).Should().BeGreaterThanOrEqualTo(3);

        var workers = await verify.Workers.IgnoreQueryFilters().Where(w => w.CompanyId == companyId).ToListAsync();
        workers.Count.Should().BeGreaterThanOrEqualTo(15);
        workers.Should().Contain(w => w.PayRateType == PayRateType.Hourly);
        workers.Should().Contain(w => w.PayRateType == PayRateType.Piecework);

        var objectNames = await verify.ConstructionObjects.IgnoreQueryFilters()
            .Where(o => o.CompanyId == companyId).Select(o => o.Name).ToListAsync();
        objectNames.Should().BeEquivalentTo(ExpectedObjectNames);

        var workOrders = await verify.WorkOrders.IgnoreQueryFilters().Where(o => o.CompanyId == companyId).ToListAsync();
        workOrders.Count.Should().BeGreaterThanOrEqualTo(12);
        workOrders.Select(o => o.Status).Distinct().Count().Should().BeGreaterThanOrEqualTo(4);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        workOrders.Should().Contain(o =>
            o.DueDate != null && o.DueDate < today && o.Status != WorkOrderStatus.Accepted && o.Status != WorkOrderStatus.Closed);

        var timesheets = await verify.Timesheets.IgnoreQueryFilters().Where(t => t.CompanyId == companyId).ToListAsync();
        timesheets.Should().NotBeEmpty();
        timesheets.Should().Contain(t => t.LateMinutes > 0);
        timesheets.Should().Contain(t => t.ApprovedAt != null);
        timesheets.Should().Contain(t => t.ApprovedAt == null);

        var materialRequests = await verify.MaterialRequests.IgnoreQueryFilters().Where(m => m.CompanyId == companyId).ToListAsync();
        materialRequests.Count.Should().BeGreaterThanOrEqualTo(6);
        materialRequests.Select(m => m.Status).Distinct().Count().Should().BeGreaterThanOrEqualTo(4);

        var payrollEntries = await verify.PayrollEntries.IgnoreQueryFilters().Where(p => p.CompanyId == companyId).ToListAsync();
        payrollEntries.Should().Contain(p => p.Status == PayrollEntryStatus.Draft);
        payrollEntries.Should().Contain(p => p.Status == PayrollEntryStatus.Approved);
        payrollEntries.Should().Contain(p => p.Status == PayrollEntryStatus.Paid);
    }

    [Fact]
    public async Task Second_run_does_not_create_duplicates()
    {
        var (connectionString, companyId) = await SeedBaseAsync(fixture);

        async Task<(int Brigades, int Workers, int Objects, int WorkOrders, int PayrollEntries, int MaterialRequests)> CountsAsync()
        {
            await using var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService());
            return (
                await context.Brigades.IgnoreQueryFilters().CountAsync(b => b.CompanyId == companyId),
                await context.Workers.IgnoreQueryFilters().CountAsync(w => w.CompanyId == companyId),
                await context.ConstructionObjects.IgnoreQueryFilters().CountAsync(o => o.CompanyId == companyId),
                await context.WorkOrders.IgnoreQueryFilters().CountAsync(o => o.CompanyId == companyId),
                await context.PayrollEntries.IgnoreQueryFilters().CountAsync(p => p.CompanyId == companyId),
                await context.MaterialRequests.IgnoreQueryFilters().CountAsync(m => m.CompanyId == companyId));
        }

        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: true).SeedAsync(CancellationToken.None);
        var firstRunCounts = await CountsAsync();

        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: true).SeedAsync(CancellationToken.None);
        var secondRunCounts = await CountsAsync();

        secondRunCounts.Should().Be(firstRunCounts);
        firstRunCounts.Brigades.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task All_demo_data_belongs_to_the_seeded_company()
    {
        var (connectionString, companyId) = await SeedBaseAsync(fixture);

        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: true).SeedAsync(CancellationToken.None);

        await using var verify = fixture.CreateDbContext(connectionString, new NullCurrentUserService());

        (await verify.Brigades.IgnoreQueryFilters().AllAsync(b => b.CompanyId == companyId)).Should().BeTrue();
        (await verify.Workers.IgnoreQueryFilters().AllAsync(w => w.CompanyId == companyId)).Should().BeTrue();
        (await verify.ConstructionObjects.IgnoreQueryFilters().AllAsync(o => o.CompanyId == companyId)).Should().BeTrue();
        (await verify.WorkOrders.IgnoreQueryFilters().AllAsync(o => o.CompanyId == companyId)).Should().BeTrue();
        (await verify.PayrollEntries.IgnoreQueryFilters().AllAsync(p => p.CompanyId == companyId)).Should().BeTrue();
        (await verify.MaterialRequests.IgnoreQueryFilters().AllAsync(m => m.CompanyId == companyId)).Should().BeTrue();
        (await verify.Timesheets.IgnoreQueryFilters().AllAsync(t => t.CompanyId == companyId)).Should().BeTrue();
    }

    [Fact]
    public async Task Object_workorder_brigade_relationships_are_consistent()
    {
        var (connectionString, companyId) = await SeedBaseAsync(fixture);

        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: true).SeedAsync(CancellationToken.None);

        await using var verify = fixture.CreateDbContext(connectionString, new NullCurrentUserService());

        var objectIds = (await verify.ConstructionObjects.IgnoreQueryFilters()
            .Where(o => o.CompanyId == companyId).Select(o => o.Id).ToListAsync()).ToHashSet();
        var brigadeIds = (await verify.Brigades.IgnoreQueryFilters()
            .Where(b => b.CompanyId == companyId).Select(b => b.Id).ToListAsync()).ToHashSet();
        var workOrders = await verify.WorkOrders.IgnoreQueryFilters().Where(o => o.CompanyId == companyId).ToListAsync();
        var workers = await verify.Workers.IgnoreQueryFilters().Where(w => w.CompanyId == companyId).ToListAsync();

        objectIds.Should().HaveCount(6);
        brigadeIds.Should().HaveCount(3);
        workOrders.Should().OnlyContain(o => objectIds.Contains(o.ObjectId) && brigadeIds.Contains(o.BrigadeId));
        workers.Should().OnlyContain(w => brigadeIds.Contains(w.BrigadeId));
    }

    [Fact]
    public async Task Existing_demo_dataset_reconciles_documented_web_accounts()
    {
        var (connectionString, companyId) = await SeedBaseAsync(fixture);
        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: true).SeedAsync(CancellationToken.None);

        var passwordHasher = new Argon2PasswordHasher();
        await using (var stale = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
        {
            var users = await stale.Users.IgnoreQueryFilters()
                .Where(user => user.CompanyId == companyId && user.Phone.StartsWith("+99290000000"))
                .ToListAsync();
            users.Should().ContainSingle(user => user.Phone == "+992900000004");

            foreach (var user in users)
            {
                user.ChangeRole(Role.Owner);
                user.Deactivate();
                user.SetPassword(passwordHasher.Hash("obsolete-password"), forcePasswordChange: true);
            }
            await stale.SaveChangesAsync();
        }

        await using (var context = fixture.CreateDbContext(connectionString, new NullCurrentUserService()))
            await CreateDemoSeedDataService(context, companyId, demoDataEnabled: true).SeedAsync(CancellationToken.None);

        await using var verify = fixture.CreateDbContext(connectionString, new NullCurrentUserService());
        var expectedRoles = new Dictionary<string, Role>
        {
            ["+992900000001"] = Role.Owner,
            ["+992900000002"] = Role.Prorab,
            ["+992900000003"] = Role.Brigadir,
            ["+992900000004"] = Role.Accountant
        };
        var accounts = await verify.Users.IgnoreQueryFilters()
            .Where(user => user.CompanyId == companyId && expectedRoles.Keys.Contains(user.Phone))
            .ToListAsync();

        accounts.Should().HaveCount(4);
        foreach (var (phone, role) in expectedRoles)
        {
            var account = accounts.Single(user => user.Phone == phone);
            account.Role.Should().Be(role);
            account.IsActive.Should().BeTrue();
            account.ForcePasswordChange.Should().BeFalse();
            passwordHasher.Verify("Demo12345!", account.PasswordHash).Should().BeTrue();
        }

        var brigadir = accounts.Single(user => user.Role == Role.Brigadir);
        (await verify.Workers.IgnoreQueryFilters()
            .AnyAsync(worker => worker.CompanyId == companyId && worker.UserId == brigadir.Id)).Should().BeTrue();
    }}

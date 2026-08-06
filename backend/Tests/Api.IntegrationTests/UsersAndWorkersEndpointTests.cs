using Application.Users;
using Application.Workers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;

namespace Api.IntegrationTests;

// Frontend integration pass: GET /users/me (all roles), GET/POST /users + block/unblock
// (Owner only), and GET /workers (company-wide, unlike the brigade-scoped
// ListBrigadeWorkersQuery). Real Postgres via PostgresFixture, same as every other
// integration test in this assembly.
[Collection(PostgresCollection.Name)]
public sealed class UsersAndWorkersEndpointTests(PostgresFixture fixture)
{
    private static readonly Argon2PasswordHasher PasswordHasher = new();

    // The returned FixedCurrentUserService.UserId must be a real, persisted User row — every
    // write this suite exercises (CreateUser, Block/Unblock) ends up writing an AdminAuditLog row
    // with ActorUserId = currentUser.UserId, and AdminAuditLogs.ActorUserId is a real FK into
    // Users. Seeded with a null-UserId bootstrap service so the seed insert itself doesn't trip
    // AdminAuditSaveChangesInterceptor (it no-ops without a UserId, same as NullCurrentUserService).
    private async Task<FixedCurrentUserService> SeedCompanyAsync()
    {
        var companyId = Guid.NewGuid();
        var bootstrap = new FixedCurrentUserService(companyId, null, Role.Owner);
        await using var context = fixture.CreateDbContext(bootstrap);

        context.Companies.Add(Company.Create(companyId, $"Users Test Co {companyId}"));
        var ownerUser = User.Create("Seed Owner", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Owner);
        context.Users.Add(ownerUser);
        await context.SaveChangesAsync(CancellationToken.None);

        return new FixedCurrentUserService(companyId, ownerUser.Id, Role.Owner);
    }

    [Fact]
    public async Task GetCurrentUser_returns_the_caller_identified_by_the_JWT_claims()
    {
        var owner = await SeedCompanyAsync();
        var phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}";

        Guid userId;
        await using (var context = fixture.CreateDbContext(owner))
        {
            var user = User.Create("Firuz Rakhmonov", phone, "hash", Role.Prorab);
            context.Users.Add(user);
            await context.SaveChangesAsync(CancellationToken.None);
            userId = user.Id;
        }

        var caller = new FixedCurrentUserService(owner.CompanyId!.Value, userId, Role.Prorab);
        await using var callerContext = fixture.CreateDbContext(caller);
        var result = await new GetCurrentUserQueryHandler(callerContext, caller).Handle(new GetCurrentUserQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(userId);
        result.Value.FullName.Should().Be("Firuz Rakhmonov");
        result.Value.Role.Should().Be(Role.Prorab);
    }

    [Fact]
    public async Task CreateUser_persists_a_ForcePasswordChange_account_and_returns_a_one_time_temporary_password()
    {
        var owner = await SeedCompanyAsync();
        await using var context = fixture.CreateDbContext(owner);

        var command = new CreateUserCommand("New Brigadir", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", Role.Brigadir);
        var result = await new CreateUserCommandHandler(context, PasswordHasher, owner).Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Role.Should().Be(Role.Brigadir);
        result.Value.User.ForcePasswordChange.Should().BeTrue();
        result.Value.TemporaryPassword.Should().NotBeNullOrEmpty();

        var persisted = await context.Users.FindAsync([result.Value.User.Id], CancellationToken.None);
        persisted.Should().NotBeNull();
        PasswordHasher.Verify(result.Value.TemporaryPassword, persisted!.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task CreateUser_rejects_a_phone_already_used_by_another_account()
    {
        var owner = await SeedCompanyAsync();
        var phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}";

        await using (var context = fixture.CreateDbContext(owner))
        {
            var first = await new CreateUserCommandHandler(context, PasswordHasher, owner)
                .Handle(new CreateUserCommand("First", phone, Role.Accountant), CancellationToken.None);
            first.IsSuccess.Should().BeTrue();
        }

        await using var secondContext = fixture.CreateDbContext(owner);
        var second = await new CreateUserCommandHandler(secondContext, PasswordHasher, owner)
            .Handle(new CreateUserCommand("Second", phone, Role.Accountant), CancellationToken.None);

        second.IsFailure.Should().BeTrue();
        second.Error.Code.Should().Be("USER_PHONE_ALREADY_EXISTS");
    }

    [Fact]
    public async Task Block_then_unblock_round_trips_IsActive()
    {
        var owner = await SeedCompanyAsync();
        Guid userId;
        await using (var context = fixture.CreateDbContext(owner))
        {
            var created = await new CreateUserCommandHandler(context, PasswordHasher, owner)
                .Handle(new CreateUserCommand("Blockable", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", Role.Prorab), CancellationToken.None);
            userId = created.Value.User.Id;
        }

        await using (var blockContext = fixture.CreateDbContext(owner))
        {
            var blocked = await new BlockUserCommandHandler(blockContext).Handle(new BlockUserCommand(userId), CancellationToken.None);
            blocked.IsSuccess.Should().BeTrue();
            blocked.Value.IsActive.Should().BeFalse();
        }

        await using var unblockContext = fixture.CreateDbContext(owner);
        var unblocked = await new UnblockUserCommandHandler(unblockContext).Handle(new UnblockUserCommand(userId), CancellationToken.None);
        unblocked.IsSuccess.Should().BeTrue();
        unblocked.Value.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task ListWorkers_is_company_wide_unlike_the_brigade_scoped_list_and_masks_PayRate_for_Prorab()
    {
        var owner = await SeedCompanyAsync();
        Guid brigadeAId;
        Guid brigadeBId;
        await using (var context = fixture.CreateDbContext(owner))
        {
            var brigadeA = Brigade.Create(owner.CompanyId!.Value, "Brigade A");
            var brigadeB = Brigade.Create(owner.CompanyId!.Value, "Brigade B");
            context.Brigades.AddRange(brigadeA, brigadeB);
            await context.SaveChangesAsync(CancellationToken.None);
            brigadeAId = brigadeA.Id;
            brigadeBId = brigadeB.Id;

            context.Workers.Add(Worker.Create(
                owner.CompanyId!.Value, brigadeAId, "Worker A", "+992900000001",
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30)), PayRateType.Hourly, 50m,
                DateOnly.FromDateTime(DateTime.UtcNow), null, null, null, null, null));
            context.Workers.Add(Worker.Create(
                owner.CompanyId!.Value, brigadeBId, "Worker B", "+992900000002",
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30)), PayRateType.Hourly, 60m,
                DateOnly.FromDateTime(DateTime.UtcNow), null, null, null, null, null));
            await context.SaveChangesAsync(CancellationToken.None);
        }

        await using var ownerContext = fixture.CreateDbContext(owner);
        var ownerResult = await new ListWorkersQueryHandler(ownerContext, owner)
            .Handle(new ListWorkersQuery(1, 20), CancellationToken.None);
        ownerResult.Value.Items.Should().HaveCount(2);
        ownerResult.Value.Items.Should().OnlyContain(w => w.PayRate != null);

        var prorab = new FixedCurrentUserService(owner.CompanyId!.Value, Guid.NewGuid(), Role.Prorab);
        await using var prorabContext = fixture.CreateDbContext(prorab);
        var prorabResult = await new ListWorkersQueryHandler(prorabContext, prorab)
            .Handle(new ListWorkersQuery(1, 20), CancellationToken.None);
        prorabResult.Value.Items.Should().HaveCount(2);
        prorabResult.Value.Items.Should().OnlyContain(w => w.PayRate == null);

        await using var scopedContext = fixture.CreateDbContext(owner);
        var scopedResult = await new ListWorkersQueryHandler(scopedContext, owner)
            .Handle(new ListWorkersQuery(1, 20, BrigadeId: brigadeAId), CancellationToken.None);
        scopedResult.Value.Items.Should().ContainSingle().Which.FullName.Should().Be("Worker A");
    }
}

using Application.Auth;
using Application.Common.Security;
using Application.Users;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

// Frontend-integration Users module (2026-07-31): MASTER §12's User row is
// Owner:CRU / everyone else: nothing — before this there was no way for
// anyone but the seeded Owner to exist in the system at all. User decision
// on password bootstrap: server generates a one-time temporary password,
// never persisted in plaintext, ForcePasswordChange=true.
[Collection(PostgresCollection.Name)]
public sealed class UsersModuleTests(PostgresFixture fixture)
{
    private readonly Argon2PasswordHasher _passwordHasher = new();

    private async Task<(FixedCurrentUserService Owner, User TargetUser)> SeedCompanyOwnerAndUserAsync()
    {
        var companyId = Guid.NewGuid();

        // AdminAuditLog.ActorUserId has a real FK to Users, so the "acting"
        // Owner needs an actual persisted row, not just a fabricated id —
        // same pattern PayrollCalculationTests.cs uses for its actor users.
        var ownerUser = User.Create(
            "Test Owner",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            _passwordHasher.Hash("owner-password"),
            Role.Owner);

        var targetUser = User.Create(
            "Target Prorab",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            _passwordHasher.Hash("initial-password"),
            Role.Prorab);

        await using var context = fixture.CreateDbContext();
        context.Companies.Add(Company.Create(companyId, $"Users Test Co {companyId}"));
        context.Users.Add(ownerUser);
        context.Users.Add(targetUser);
        await context.SaveChangesAsync(CancellationToken.None);

        var owner = new FixedCurrentUserService(companyId, ownerUser.Id, Role.Owner);
        return (owner, targetUser);
    }

    [Fact]
    public async Task Create_generates_a_working_temporary_password_and_writes_audit_log()
    {
        var (owner, _) = await SeedCompanyOwnerAndUserAsync();
        var phone = $"+992{Random.Shared.NextInt64(100000000, 999999999)}";

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateUserCommandHandler(context, _passwordHasher, owner)
            .Handle(new CreateUserCommand("New Brigadir", phone, Role.Brigadir), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Phone.Should().Be(phone);
        result.Value.User.Role.Should().Be("Brigadir");
        result.Value.User.ForcePasswordChange.Should().BeTrue();
        result.Value.TemporaryPassword.Should().NotBeNullOrWhiteSpace();
        result.Value.TemporaryPassword.Length.Should().Be(12);

        // The temporary password must actually authenticate — not just look
        // like a password. Same LoginCommandHandler the real /auth/login
        // endpoint uses, proving the hash round-trips correctly.
        await using var loginContext = fixture.CreateDbContext();
        var loginHandler = new LoginCommandHandler(loginContext, _passwordHasher, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var loginResult = await loginHandler.Handle(new LoginCommand(phone, result.Value.TemporaryPassword, "127.0.0.1"), CancellationToken.None);
        loginResult.IsSuccess.Should().BeTrue();
        loginResult.Value.ForcePasswordChange.Should().BeTrue();

        await using var auditContext = fixture.CreateDbContext();
        var auditEntry = await auditContext.AdminAuditLogs.IgnoreQueryFilters()
            .SingleOrDefaultAsync(a => a.TargetEntityId == result.Value.User.Id);
        auditEntry.Should().NotBeNull();
        auditEntry!.Action.Should().Be(AdminAuditAction.UserCreated);
        auditEntry.ActorUserId.Should().Be(owner.UserId!.Value);
    }

    [Fact]
    public async Task Create_with_a_phone_already_in_use_is_rejected()
    {
        var (owner, existingUser) = await SeedCompanyOwnerAndUserAsync();

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateUserCommandHandler(context, _passwordHasher, owner)
            .Handle(new CreateUserCommand("Duplicate Phone", existingUser.Phone, Role.Accountant), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PHONE_ALREADY_IN_USE");
    }

    [Fact]
    public async Task Owner_cannot_change_their_own_role()
    {
        var (owner, _) = await SeedCompanyOwnerAndUserAsync();

        await using var context = fixture.CreateDbContext(owner);
        var result = await new ChangeUserRoleCommandHandler(context, owner)
            .Handle(new ChangeUserRoleCommand(owner.UserId!.Value, Role.Accountant), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("CANNOT_MODIFY_OWN_ACCOUNT");
    }

    [Fact]
    public async Task Change_role_updates_the_user_and_writes_audit_log()
    {
        var (owner, targetUser) = await SeedCompanyOwnerAndUserAsync();

        await using var context = fixture.CreateDbContext(owner);
        var result = await new ChangeUserRoleCommandHandler(context, owner)
            .Handle(new ChangeUserRoleCommand(targetUser.Id, Role.Accountant), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Role.Should().Be("Accountant");

        await using var auditContext = fixture.CreateDbContext();
        var auditEntry = await auditContext.AdminAuditLogs.IgnoreQueryFilters()
            .SingleOrDefaultAsync(a => a.TargetEntityId == targetUser.Id && a.Action == AdminAuditAction.RoleChanged);
        auditEntry.Should().NotBeNull();
    }

    [Fact]
    public async Task Owner_cannot_deactivate_their_own_account()
    {
        var (owner, _) = await SeedCompanyOwnerAndUserAsync();

        await using var context = fixture.CreateDbContext(owner);
        var result = await new DeactivateUserCommandHandler(context, owner)
            .Handle(new DeactivateUserCommand(owner.UserId!.Value), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("CANNOT_MODIFY_OWN_ACCOUNT");
    }

    [Fact]
    public async Task Deactivate_revokes_active_refresh_tokens_and_a_reactivated_user_can_log_in_again()
    {
        var (owner, targetUser) = await SeedCompanyOwnerAndUserAsync();

        // Give the target user a live refresh token, as a real login would.
        await using (var seedTokenContext = fixture.CreateDbContext())
        {
            var refreshToken = Domain.Entities.RefreshToken.Create(
                owner.CompanyId!.Value, targetUser.Id, RefreshTokenGenerator.Hash("some-token"),
                DateTimeOffset.UtcNow.AddDays(30), "127.0.0.1");
            seedTokenContext.RefreshTokens.Add(refreshToken);
            await seedTokenContext.SaveChangesAsync(CancellationToken.None);
        }

        await using (var deactivateContext = fixture.CreateDbContext(owner))
        {
            var deactivateResult = await new DeactivateUserCommandHandler(deactivateContext, owner)
                .Handle(new DeactivateUserCommand(targetUser.Id), CancellationToken.None);
            deactivateResult.IsSuccess.Should().BeTrue();
            deactivateResult.Value.IsActive.Should().BeFalse();
        }

        await using (var verifyContext = fixture.CreateDbContext())
        {
            var token = await verifyContext.RefreshTokens.IgnoreQueryFilters().SingleAsync(rt => rt.UserId == targetUser.Id);
            token.RevokedAt.Should().NotBeNull();
        }

        await using (var activateContext = fixture.CreateDbContext(owner))
        {
            var activateResult = await new ActivateUserCommandHandler(activateContext, owner)
                .Handle(new ActivateUserCommand(targetUser.Id), CancellationToken.None);
            activateResult.IsSuccess.Should().BeTrue();
            activateResult.Value.IsActive.Should().BeTrue();
        }

        await using var loginContext = fixture.CreateDbContext();
        var loginHandler = new LoginCommandHandler(loginContext, _passwordHasher, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var loginResult = await loginHandler.Handle(new LoginCommand(targetUser.Phone, "initial-password", "127.0.0.1"), CancellationToken.None);
        loginResult.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Regenerating_the_temporary_password_revokes_old_sessions_and_issues_a_working_new_password()
    {
        var (owner, targetUser) = await SeedCompanyOwnerAndUserAsync();

        await using (var seedTokenContext = fixture.CreateDbContext())
        {
            var refreshToken = Domain.Entities.RefreshToken.Create(
                owner.CompanyId!.Value, targetUser.Id, RefreshTokenGenerator.Hash("stale-token"),
                DateTimeOffset.UtcNow.AddDays(30), "127.0.0.1");
            seedTokenContext.RefreshTokens.Add(refreshToken);
            await seedTokenContext.SaveChangesAsync(CancellationToken.None);
        }

        await using var context = fixture.CreateDbContext(owner);
        var result = await new RegenerateTemporaryPasswordCommandHandler(context, _passwordHasher, owner)
            .Handle(new RegenerateTemporaryPasswordCommand(targetUser.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.User.ForcePasswordChange.Should().BeTrue();

        await using var verifyContext = fixture.CreateDbContext();
        var token = await verifyContext.RefreshTokens.IgnoreQueryFilters().SingleAsync(rt => rt.UserId == targetUser.Id);
        token.RevokedAt.Should().NotBeNull();

        var auditEntry = await verifyContext.AdminAuditLogs.IgnoreQueryFilters()
            .SingleOrDefaultAsync(a => a.TargetEntityId == targetUser.Id && a.Action == AdminAuditAction.TempPasswordRegenerated);
        auditEntry.Should().NotBeNull();

        await using var loginContext = fixture.CreateDbContext();
        var loginHandler = new LoginCommandHandler(loginContext, _passwordHasher, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var oldPasswordResult = await loginHandler.Handle(new LoginCommand(targetUser.Phone, "initial-password", "127.0.0.1"), CancellationToken.None);
        oldPasswordResult.IsFailure.Should().BeTrue("the old password must stop working once regenerated");

        var newPasswordResult = await loginHandler.Handle(new LoginCommand(targetUser.Phone, result.Value.TemporaryPassword, "127.0.0.1"), CancellationToken.None);
        newPasswordResult.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task List_paginates_and_never_exposes_a_password_hash()
    {
        var (owner, _) = await SeedCompanyOwnerAndUserAsync();

        await using var context = fixture.CreateDbContext(owner);
        var result = await new ListUsersQueryHandler(context).Handle(new ListUsersQuery(1, 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().NotBeEmpty();
        result.Value.Items.Should().OnlyContain(u => u.Phone != null);
        // UserDto has no PasswordHash property at all — this assertion documents
        // that guarantee via reflection rather than trusting the record shape by eye.
        typeof(UserDto).GetProperty("PasswordHash").Should().BeNull();
    }
}

using Application.Auth;
using Application.Common.Security;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class LoginCommandHandlerTests(PostgresFixture fixture)
{
    private readonly Argon2PasswordHasher _passwordHasher = new();

    private async Task<(User User, Guid CompanyId)> SeedUserAsync(string password, bool isActive = true)
    {
        await using var context = fixture.CreateDbContext();

        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        // Role.Prorab, not Owner — SeedDataServiceTests shares this same database
        // and gates its own seeding on "any Owner exists?"; an Owner created here
        // would make that check pass prematurely and break its no-op assertions.
        var user = User.Create(
            "Login Test User",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            _passwordHasher.Hash(password),
            Role.Prorab);

        if (!isActive)
            user.Deactivate();

        context.Companies.Add(company);
        context.Users.Add(user);
        await context.SaveChangesAsync(CancellationToken.None);

        return (user, company.Id);
    }

    [Fact]
    public async Task Success_returns_tokens_and_persists_hashed_refresh_token()
    {
        const string password = "correct-horse-battery-staple";
        var (user, _) = await SeedUserAsync(password);

        await using var context = fixture.CreateDbContext();
        var handler = new LoginCommandHandler(context, _passwordHasher, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);

        var result = await handler.Handle(new LoginCommand(user.Phone, password, "127.0.0.1"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.AccessToken.Should().NotBeNullOrWhiteSpace();
        result.Value.RefreshToken.Should().NotBeNullOrWhiteSpace();

        await using var verifyContext = fixture.CreateDbContext();
        var tokenHash = RefreshTokenGenerator.Hash(result.Value.RefreshToken);
        var persisted = await verifyContext.RefreshTokens.IgnoreQueryFilters()
            .SingleOrDefaultAsync(rt => rt.UserId == user.Id);

        persisted.Should().NotBeNull();
        persisted!.TokenHash.Should().Be(tokenHash);
        persisted.TokenHash.Should().NotBe(result.Value.RefreshToken);
    }

    [Fact]
    public async Task Wrong_password_returns_same_error_as_unknown_phone()
    {
        var (user, _) = await SeedUserAsync("correct-password");

        await using var context = fixture.CreateDbContext();
        var handler = new LoginCommandHandler(context, _passwordHasher, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);

        var wrongPasswordResult = await handler.Handle(new LoginCommand(user.Phone, "wrong-password", "127.0.0.1"), CancellationToken.None);
        var unknownPhoneResult = await handler.Handle(new LoginCommand("+992000000000", "anything", "127.0.0.1"), CancellationToken.None);

        wrongPasswordResult.IsSuccess.Should().BeFalse();
        wrongPasswordResult.Error.Code.Should().Be("AUTH_INVALID_CREDENTIALS");
        unknownPhoneResult.Error.Code.Should().Be(wrongPasswordResult.Error.Code);
    }

    [Fact]
    public async Task Deactivated_account_is_rejected()
    {
        const string password = "correct-password";
        var (user, _) = await SeedUserAsync(password, isActive: false);

        await using var context = fixture.CreateDbContext();
        var handler = new LoginCommandHandler(context, _passwordHasher, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);

        var result = await handler.Handle(new LoginCommand(user.Phone, password, "127.0.0.1"), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_ACCOUNT_DEACTIVATED");
    }
}

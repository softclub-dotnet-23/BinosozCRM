using Application.Auth;
using Application.Common.Security;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class RefreshTokenCommandHandlerTests(PostgresFixture fixture)
{
    private readonly Argon2PasswordHasher _passwordHasher = new();

    private async Task<(User User, Guid CompanyId, string PlainToken)> SeedUserWithRefreshTokenAsync()
    {
        await using var context = fixture.CreateDbContext();

        var company = Company.Create(Guid.NewGuid(), $"Test Co {Guid.NewGuid()}");
        // Role.Prorab, not Owner — see LoginCommandHandlerTests for why (shared
        // database with SeedDataServiceTests, which gates on "any Owner exists?").
        var user = User.Create(
            "Refresh Test User",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            _passwordHasher.Hash("irrelevant"),
            Role.Prorab);

        var plainToken = RefreshTokenGenerator.GenerateToken();
        var refreshToken = RefreshToken.Create(
            company.Id,
            user.Id,
            RefreshTokenGenerator.Hash(plainToken),
            DateTimeOffset.UtcNow.AddDays(30),
            "127.0.0.1");

        context.Companies.Add(company);
        context.Users.Add(user);
        context.RefreshTokens.Add(refreshToken);
        await context.SaveChangesAsync(CancellationToken.None);

        return (user, company.Id, plainToken);
    }

    private static RefreshTokenCommandHandler CreateHandler(Infrastructure.Persistence.ApplicationDbContext context) =>
        new(context, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);

    [Fact]
    public async Task Rotation_issues_new_token_and_revokes_old_one()
    {
        var (user, _, plainToken) = await SeedUserWithRefreshTokenAsync();

        await using var context = fixture.CreateDbContext();
        var result = await CreateHandler(context).Handle(new RefreshTokenCommand(plainToken, "127.0.0.1"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.RefreshToken.Should().NotBe(plainToken);

        await using var verifyContext = fixture.CreateDbContext();
        var oldTokenHash = RefreshTokenGenerator.Hash(plainToken);
        var oldToken = await verifyContext.RefreshTokens.IgnoreQueryFilters()
            .SingleAsync(rt => rt.TokenHash == oldTokenHash);

        oldToken.RevokedAt.Should().NotBeNull();
        oldToken.ReplacedByTokenId.Should().NotBeNull();

        var newTokenHash = RefreshTokenGenerator.Hash(result.Value.RefreshToken);
        var newToken = await verifyContext.RefreshTokens.IgnoreQueryFilters()
            .SingleAsync(rt => rt.TokenHash == newTokenHash);

        newToken.Id.Should().Be(oldToken.ReplacedByTokenId!.Value);
        newToken.UserId.Should().Be(user.Id);
        newToken.RevokedAt.Should().BeNull();
    }

    [Fact]
    public async Task Reuse_of_a_revoked_token_revokes_the_whole_chain()
    {
        var (user, _, plainToken) = await SeedUserWithRefreshTokenAsync();

        await using (var firstUse = fixture.CreateDbContext())
        {
            var rotated = await CreateHandler(firstUse).Handle(new RefreshTokenCommand(plainToken, "127.0.0.1"), CancellationToken.None);
            rotated.IsSuccess.Should().BeTrue();

            // Rotate again so there's a still-active token in the chain to prove
            // "whole chain" revocation, not just the reused one.
            await using var secondRotation = fixture.CreateDbContext();
            var secondResult = await CreateHandler(secondRotation).Handle(new RefreshTokenCommand(rotated.Value.RefreshToken, "127.0.0.1"), CancellationToken.None);
            secondResult.IsSuccess.Should().BeTrue();
        }

        // Present the very first (already-rotated-away) token again — theft signal.
        await using var reuseContext = fixture.CreateDbContext();
        var reuseResult = await CreateHandler(reuseContext).Handle(new RefreshTokenCommand(plainToken, "127.0.0.1"), CancellationToken.None);

        reuseResult.IsSuccess.Should().BeFalse();
        reuseResult.Error.Code.Should().Be("AUTH_REFRESH_TOKEN_REUSED");

        await using var verifyContext = fixture.CreateDbContext();
        var remainingActive = await verifyContext.RefreshTokens.IgnoreQueryFilters()
            .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
            .CountAsync();

        remainingActive.Should().Be(0);
    }

    [Fact]
    public async Task Unknown_token_is_invalid()
    {
        await using var context = fixture.CreateDbContext();

        var result = await CreateHandler(context).Handle(
            new RefreshTokenCommand(RefreshTokenGenerator.GenerateToken(), "127.0.0.1"),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_REFRESH_TOKEN_INVALID");
    }
}

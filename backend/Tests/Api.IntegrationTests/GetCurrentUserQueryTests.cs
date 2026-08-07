using Application.Auth;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// GET /auth/me (Api/Controllers/AuthController.cs) — open to every authenticated role, unlike
// UsersController (Owner-only). Frontend-integration: this is the "who am I" lookup the frontend
// needs right after login (no display name is ever carried in the JWT itself). No existing test
// covered this handler yet.
[Collection(PostgresCollection.Name)]
public sealed class GetCurrentUserQueryTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Returns_the_caller_identified_by_the_JWT_claims()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, role: Role.Owner);

        User targetUser;
        await using (var context = fixture.CreateDbContext(owner))
        {
            context.Companies.Add(Company.Create(companyId, $"Me Test Co {companyId}"));
            targetUser = User.Create(companyId, "Target Prorab", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Role.Prorab);
            context.Users.Add(targetUser);
            await context.SaveChangesAsync(CancellationToken.None);
        }

        var caller = new FixedCurrentUserService(companyId, targetUser.Id, Role.Prorab);
        await using var callerContext = fixture.CreateDbContext(caller);
        var result = await new GetCurrentUserQueryHandler(callerContext, caller).Handle(new GetCurrentUserQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(targetUser.Id);
        result.Value.FullName.Should().Be("Target Prorab");
        result.Value.Phone.Should().Be(targetUser.Phone);
        result.Value.Role.Should().Be("Prorab");
    }

    [Fact]
    public async Task With_no_matching_user_row_returns_USER_NOT_FOUND()
    {
        var caller = new FixedCurrentUserService(Guid.NewGuid(), Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(caller);

        var result = await new GetCurrentUserQueryHandler(context, caller).Handle(new GetCurrentUserQuery(), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("USER_NOT_FOUND");
    }
}

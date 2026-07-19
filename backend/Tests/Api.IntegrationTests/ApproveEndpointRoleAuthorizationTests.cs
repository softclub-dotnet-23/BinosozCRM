using System.Net;
using System.Net.Http.Headers;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;

namespace Api.IntegrationTests;

// MASTER §12's literal role-matrix row for both WorkOrderPayoutShare and
// Timesheet is "Owner: R, Prorab: RA" — Owner has no approve rights on
// either entity, unlike almost everywhere else in this codebase where
// Owner ⊇ Prorab (Phase 5 Step 1, explicit business decision, see
// PROGRESS.md). [Authorize(Roles = "Prorab")] on both controllers is what
// actually enforces this — nothing in the handlers themselves checks role,
// so this has to run through the real HTTP pipeline to mean anything; a
// direct handler call (every other test in this project) would silently
// let Owner through regardless of the attribute.
[Collection(PostgresCollection.Name)]
public sealed class ApproveEndpointRoleAuthorizationTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ApproveEndpointRoleAuthorizationTests(PostgresFixture fixture)
    {
        _factory = new CustomWebApplicationFactory(fixture.ConnectionString);
        _client = _factory.CreateClient();
    }

    private static string BuildOwnerAccessToken()
    {
        var fakeOwner = User.Create("Test Owner", "+992900000001", "irrelevant-hash", Role.Owner);
        var tokenService = new JwtTokenService(AuthTestOptions.Jwt);
        return tokenService.GenerateAccessToken(fakeOwner, Guid.NewGuid()).Token;
    }

    [Fact]
    public async Task Owner_is_forbidden_from_approving_work_order_payout_shares()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", BuildOwnerAccessToken());

        var response = await _client.PostAsync($"/api/v1/work-orders/{Guid.NewGuid()}/payout-shares/approve", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Owner_is_forbidden_from_approving_a_timesheet()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", BuildOwnerAccessToken());

        var response = await _client.PostAsync($"/api/v1/timesheets/{Guid.NewGuid()}/approve", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }
}

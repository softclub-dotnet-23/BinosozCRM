using System.Net;
using FluentAssertions;

namespace Api.IntegrationTests;

// These tests deliberately go through the real HTTP host and ASP.NET Core's
// [Authorize] pipeline instead of invoking handlers directly (WorkersListingTests
// does that, for business-logic coverage). WorkersController's class-level
// [Authorize] carries no Roles — it only requires authentication — and each
// action layers its own Roles on top, so class-level and method-level combine
// with AND as "authenticated AND in one of these roles", not two competing
// role lists. Asserting that here catches a regression if the class-level
// attribute is ever tightened to carry Roles again.
[Collection(PostgresCollection.Name)]
public sealed class WorkersHttpAuthorizationTests(PostgresFixture fixture)
{
    [Fact]
    public async Task GET_workers_allows_Owner_Prorab_and_Accountant_but_not_Brigadir()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);

        foreach (var allowed in new[] { seed.Owner, seed.Prorab, seed.Accountant })
        {
            using var client = ApiHttpTestSupport.CreateClient(factory, allowed, seed.Company.Id);
            (await client.GetAsync("/api/v1/workers?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.OK);
        }

        using var brigadirClient = ApiHttpTestSupport.CreateClient(factory, seed.Brigadir, seed.Company.Id);
        (await brigadirClient.GetAsync("/api/v1/workers?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GET_brigades_mine_workers_allows_only_Brigadir()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);

        using var brigadirClient = ApiHttpTestSupport.CreateClient(factory, seed.Brigadir, seed.Company.Id);
        var brigadirResponse = await brigadirClient.GetAsync("/api/v1/brigades/mine/workers?page=1&pageSize=20");
        brigadirResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var body = await ApiHttpTestSupport.ReadJsonAsync(brigadirResponse);
        body.RootElement.GetProperty("items").EnumerateArray().Should()
            .ContainSingle(w => w.GetProperty("id").GetGuid() == seed.BrigadirWorker.Id);

        foreach (var denied in new[] { seed.Owner, seed.Prorab, seed.Accountant })
        {
            using var client = ApiHttpTestSupport.CreateClient(factory, denied, seed.Company.Id);
            (await client.GetAsync("/api/v1/brigades/mine/workers?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }
}

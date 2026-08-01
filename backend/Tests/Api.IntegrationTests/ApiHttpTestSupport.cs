using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Api.IntegrationTests;

internal sealed record ApiHttpTestSeed(
    Company Company,
    Company ForeignCompany,
    Customer Customer,
    Customer ForeignCustomer,
    ConstructionObject Object,
    ConstructionObject ForeignObject,
    Brigade Brigade,
    Brigade ForeignBrigade,
    User Owner,
    User Prorab,
    User Brigadir,
    User Accountant,
    User ForeignOwner,
    Worker BrigadirWorker);

internal static class ApiHttpTestSupport
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public static HttpClient CreateClient(ApiTestFactory factory, User user, Guid companyId)
    {
        var token = new JwtTokenService(AuthTestOptions.Jwt).GenerateAccessToken(user, companyId).Token;
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public static HttpContent Json(object value) => JsonContent.Create(value, options: JsonOptions);

    public static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStreamAsync());

    public static async Task AssertErrorAsync(HttpResponseMessage response, HttpStatusCode expectedStatus, string expectedCode)
    {
        response.StatusCode.Should().Be(expectedStatus);

        using var body = await ReadJsonAsync(response);
        var error = body.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be(expectedCode);
        error.GetProperty("traceId").GetString().Should().NotBeNullOrWhiteSpace();
    }

    public static async Task<ApiHttpTestSeed> SeedAsync(PostgresFixture fixture)
    {
        var company = Company.Create(Guid.NewGuid(), $"API test company {Guid.NewGuid():N}");
        var foreignCompany = Company.Create(Guid.NewGuid(), $"Foreign API test company {Guid.NewGuid():N}");

        var owner = NewUser(company.Id, "Owner", Role.Owner);
        var prorab = NewUser(company.Id, "Prorab", Role.Prorab);
        var brigadir = NewUser(company.Id, "Brigadir", Role.Brigadir);
        var accountant = NewUser(company.Id, "Accountant", Role.Accountant);
        var foreignOwner = NewUser(foreignCompany.Id, "Foreign owner", Role.Owner);

        var customer = Customer.Create(company.Id, "Existing customer", "Customer contact", "+992900000001");
        var foreignCustomer = Customer.Create(foreignCompany.Id, "Foreign customer", "Foreign contact", "+992900000002");
        var obj = ConstructionObject.Create(company.Id, "Existing object", customer.Id, "Existing address", new DateOnly(2026, 1, 1), null, 1000m);
        var foreignObject = ConstructionObject.Create(foreignCompany.Id, "Foreign object", foreignCustomer.Id, "Foreign address", null, null, 2000m);
        var brigade = Brigade.Create(company.Id, "Existing brigade");
        brigade.AssignBrigadir(brigadir.Id);
        var foreignBrigade = Brigade.Create(foreignCompany.Id, "Foreign brigade");
        var brigadirWorker = Worker.Create(
            company.Id,
            brigade.Id,
            "Brigadir worker",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1),
            PayRateType.Hourly,
            40m,
            new DateOnly(2020, 1, 1),
            userId: brigadir.Id);

        await using var context = fixture.CreateDbContext();
        context.AddRange(
            company,
            foreignCompany,
            owner,
            prorab,
            brigadir,
            accountant,
            foreignOwner,
            customer,
            foreignCustomer,
            obj,
            foreignObject,
            brigade,
            foreignBrigade,
            brigadirWorker);
        await context.SaveChangesAsync(CancellationToken.None);

        return new ApiHttpTestSeed(
            company,
            foreignCompany,
            customer,
            foreignCustomer,
            obj,
            foreignObject,
            brigade,
            foreignBrigade,
            owner,
            prorab,
            brigadir,
            accountant,
            foreignOwner,
            brigadirWorker);
    }

    private static User NewUser(Guid companyId, string name, Role role) => User.Create(
        companyId,
        name,
        $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
        "test-password-hash",
        role);
}

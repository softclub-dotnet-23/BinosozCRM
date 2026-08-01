using System.Net;
using System.Text.Json;
using Domain.Enums;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

// These tests deliberately use the real HTTP host rather than invoking
// handlers directly. They cover the contract boundary where JWT claims,
// [Authorize], FluentValidation, Result-to-HTTP mapping and EF tenant filters
// all meet for the Customers/Objects module.
[Collection(PostgresCollection.Name)]
public sealed class ObjectsCustomersHttpTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Owner_can_create_customer_then_object_and_receives_the_documented_dtos()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);
        using var client = ApiHttpTestSupport.CreateClient(factory, seed.Owner, seed.Company.Id);

        using var createCustomer = await client.PostAsync("/api/v1/customers", ApiHttpTestSupport.Json(new
        {
            name = "New customer",
            contactPerson = "Customer contact",
            contactPhone = "+992900123456"
        }));

        createCustomer.StatusCode.Should().Be(HttpStatusCode.OK);
        using var customerBody = await ApiHttpTestSupport.ReadJsonAsync(createCustomer);
        var customer = customerBody.RootElement;
        AssertCustomerDto(customer, "New customer", "Customer contact", "+992900123456");
        var customerId = customer.GetProperty("id").GetGuid();

        using var createObject = await client.PostAsync("/api/v1/objects", ApiHttpTestSupport.Json(new
        {
            name = "New object",
            customerId,
            address = "Dushanbe, Rudaki 1",
            startDate = "2026-08-01",
            plannedEndDate = "2026-12-31",
            budget = 250000.50m
        }));

        createObject.StatusCode.Should().Be(HttpStatusCode.OK);
        using var objectBody = await ApiHttpTestSupport.ReadJsonAsync(createObject);
        AssertObjectDto(
            objectBody.RootElement,
            "New object",
            customerId,
            "Dushanbe, Rudaki 1",
            ConstructionObjectStatus.Planned,
            "2026-08-01",
            "2026-12-31",
            null,
            250000.50m);
    }

    [Fact]
    public async Task Prorab_without_assignments_can_create_customers_and_objects()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);
        using var client = ApiHttpTestSupport.CreateClient(factory, seed.Prorab, seed.Company.Id);

        using var createCustomer = await client.PostAsync("/api/v1/customers", ApiHttpTestSupport.Json(new
        {
            name = "Prorab customer",
            contactPerson = (string?)null,
            contactPhone = (string?)null
        }));

        createCustomer.StatusCode.Should().Be(HttpStatusCode.OK);
        using var customerBody = await ApiHttpTestSupport.ReadJsonAsync(createCustomer);
        var customerId = customerBody.RootElement.GetProperty("id").GetGuid();
        AssertCustomerDto(customerBody.RootElement, "Prorab customer", null, null);

        using var createObject = await client.PostAsync("/api/v1/objects", ApiHttpTestSupport.Json(new
        {
            name = "Prorab object",
            customerId,
            address = (string?)null,
            startDate = (string?)null,
            plannedEndDate = (string?)null,
            budget = (decimal?)null
        }));

        createObject.StatusCode.Should().Be(HttpStatusCode.OK);
        using var objectBody = await ApiHttpTestSupport.ReadJsonAsync(createObject);
        AssertObjectDto(
            objectBody.RootElement,
            "Prorab object",
            customerId,
            null,
            ConstructionObjectStatus.Planned,
            null,
            null,
            null,
            null);
    }

    [Fact]
    public async Task Object_creation_rejects_missing_and_foreign_customers_with_404_without_creating_rows()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        var initialCount = await CountObjectsAsync(seed.Company.Id);
        using var factory = new ApiTestFactory(fixture);
        using var client = ApiHttpTestSupport.CreateClient(factory, seed.Owner, seed.Company.Id);

        using var missingCustomer = await client.PostAsync("/api/v1/objects", ApiHttpTestSupport.Json(new
        {
            name = "Object with missing customer",
            customerId = Guid.NewGuid(),
            address = (string?)null,
            startDate = (string?)null,
            plannedEndDate = (string?)null,
            budget = (decimal?)null
        }));
        await ApiHttpTestSupport.AssertErrorAsync(missingCustomer, HttpStatusCode.NotFound, "CUSTOMER_NOT_FOUND");

        using var foreignCustomer = await client.PostAsync("/api/v1/objects", ApiHttpTestSupport.Json(new
        {
            name = "Object with foreign customer",
            customerId = seed.ForeignCustomer.Id,
            address = (string?)null,
            startDate = (string?)null,
            plannedEndDate = (string?)null,
            budget = (decimal?)null
        }));
        await ApiHttpTestSupport.AssertErrorAsync(foreignCustomer, HttpStatusCode.NotFound, "CUSTOMER_NOT_FOUND");

        (await CountObjectsAsync(seed.Company.Id)).Should().Be(initialCount);
        (await CountObjectsAsync(seed.ForeignCompany.Id)).Should().Be(1);
    }

    [Fact]
    public async Task Customer_and_object_lists_and_object_get_return_dtos_and_hide_another_company()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);
        using var client = ApiHttpTestSupport.CreateClient(factory, seed.Owner, seed.Company.Id);

        using var customerList = await client.GetAsync("/api/v1/customers?page=1&pageSize=20");
        customerList.StatusCode.Should().Be(HttpStatusCode.OK);
        using var customerListBody = await ApiHttpTestSupport.ReadJsonAsync(customerList);
        AssertPagedContract(customerListBody.RootElement, 1, 20, 1);
        var customers = customerListBody.RootElement.GetProperty("items").EnumerateArray().ToList();
        customers.Should().ContainSingle();
        AssertCustomerDto(customers[0], seed.Customer.Name, seed.Customer.ContactPerson, seed.Customer.ContactPhone);
        customers[0].GetProperty("id").GetGuid().Should().Be(seed.Customer.Id);

        using var objectList = await client.GetAsync("/api/v1/objects?page=1&pageSize=20");
        objectList.StatusCode.Should().Be(HttpStatusCode.OK);
        using var objectListBody = await ApiHttpTestSupport.ReadJsonAsync(objectList);
        AssertPagedContract(objectListBody.RootElement, 1, 20, 1);
        var objects = objectListBody.RootElement.GetProperty("items").EnumerateArray().ToList();
        objects.Should().ContainSingle();
        AssertObjectDto(
            objects[0],
            seed.Object.Name,
            seed.Customer.Id,
            seed.Object.Address,
            ConstructionObjectStatus.Planned,
            "2026-01-01",
            null,
            null,
            1000m);
        objects[0].GetProperty("id").GetGuid().Should().Be(seed.Object.Id);

        using var getOwnObject = await client.GetAsync($"/api/v1/objects/{seed.Object.Id}");
        getOwnObject.StatusCode.Should().Be(HttpStatusCode.OK);
        using var ownObjectBody = await ApiHttpTestSupport.ReadJsonAsync(getOwnObject);
        AssertObjectDto(
            ownObjectBody.RootElement,
            seed.Object.Name,
            seed.Customer.Id,
            seed.Object.Address,
            ConstructionObjectStatus.Planned,
            "2026-01-01",
            null,
            null,
            1000m);

        using var getForeignObject = await client.GetAsync($"/api/v1/objects/{seed.ForeignObject.Id}");
        await ApiHttpTestSupport.AssertErrorAsync(getForeignObject, HttpStatusCode.NotFound, "OBJECT_NOT_FOUND");
    }

    [Fact]
    public async Task Object_update_returns_dto_and_cannot_change_another_company_object()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);
        using var client = ApiHttpTestSupport.CreateClient(factory, seed.Owner, seed.Company.Id);

        using var updateOwn = await client.PutAsync($"/api/v1/objects/{seed.Object.Id}", ApiHttpTestSupport.Json(new
        {
            name = "Updated object",
            address = "Updated address",
            status = ConstructionObjectStatus.InProgress,
            startDate = "2026-02-01",
            plannedEndDate = "2026-12-15",
            actualEndDate = (string?)null,
            budget = 3210.75m
        }));

        updateOwn.StatusCode.Should().Be(HttpStatusCode.OK);
        using var ownBody = await ApiHttpTestSupport.ReadJsonAsync(updateOwn);
        AssertObjectDto(
            ownBody.RootElement,
            "Updated object",
            seed.Customer.Id,
            "Updated address",
            ConstructionObjectStatus.InProgress,
            "2026-02-01",
            "2026-12-15",
            null,
            3210.75m);

        using var updateForeign = await client.PutAsync($"/api/v1/objects/{seed.ForeignObject.Id}", ApiHttpTestSupport.Json(new
        {
            name = "Cross-company overwrite",
            address = "Should not persist",
            status = ConstructionObjectStatus.Closed,
            startDate = (string?)null,
            plannedEndDate = (string?)null,
            actualEndDate = "2026-08-01",
            budget = 1m
        }));
        await ApiHttpTestSupport.AssertErrorAsync(updateForeign, HttpStatusCode.NotFound, "OBJECT_NOT_FOUND");

        var foreignObject = await GetObjectAsync(seed.ForeignObject.Id);
        foreignObject.Name.Should().Be("Foreign object");
        foreignObject.Address.Should().Be("Foreign address");
        foreignObject.Status.Should().Be(ConstructionObjectStatus.Planned);
        foreignObject.Budget.Should().Be(2000m);
    }

    [Fact]
    public async Task Customer_and_object_validation_errors_use_the_standard_400_error_envelope_without_mutation()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        var customerCount = await CountCustomersAsync(seed.Company.Id);
        var objectCount = await CountObjectsAsync(seed.Company.Id);
        using var factory = new ApiTestFactory(fixture);
        using var client = ApiHttpTestSupport.CreateClient(factory, seed.Owner, seed.Company.Id);

        using var invalidCustomer = await client.PostAsync("/api/v1/customers", ApiHttpTestSupport.Json(new
        {
            name = "",
            contactPerson = "Contact",
            contactPhone = "+992900123456"
        }));
        await ApiHttpTestSupport.AssertErrorAsync(invalidCustomer, HttpStatusCode.BadRequest, "VALIDATION_FAILED");

        using var invalidObject = await client.PostAsync("/api/v1/objects", ApiHttpTestSupport.Json(new
        {
            name = "",
            customerId = seed.Customer.Id,
            address = new string('x', 501),
            startDate = (string?)null,
            plannedEndDate = (string?)null,
            budget = -1m
        }));
        await ApiHttpTestSupport.AssertErrorAsync(invalidObject, HttpStatusCode.BadRequest, "VALIDATION_FAILED");

        (await CountCustomersAsync(seed.Company.Id)).Should().Be(customerCount);
        (await CountObjectsAsync(seed.Company.Id)).Should().Be(objectCount);
    }

    [Fact]
    public async Task Customers_and_objects_enforce_the_current_owner_prorab_only_http_policy()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);

        foreach (var allowed in new[] { seed.Owner, seed.Prorab })
        {
            using var client = ApiHttpTestSupport.CreateClient(factory, allowed, seed.Company.Id);
            (await client.GetAsync("/api/v1/customers?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.OK);
            (await client.GetAsync("/api/v1/objects?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.OK);
        }

        foreach (var denied in new[] { seed.Brigadir, seed.Accountant })
        {
            using var client = ApiHttpTestSupport.CreateClient(factory, denied, seed.Company.Id);
            (await client.GetAsync("/api/v1/customers?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
            (await client.GetAsync("/api/v1/objects?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        using var anonymousClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });
        (await anonymousClient.GetAsync("/api/v1/customers?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await anonymousClient.GetAsync("/api/v1/objects?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<int> CountCustomersAsync(Guid companyId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.Customers
            .IgnoreQueryFilters()
            .CountAsync(customer => customer.CompanyId == companyId);
    }

    private async Task<int> CountObjectsAsync(Guid companyId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.ConstructionObjects
            .IgnoreQueryFilters()
            .CountAsync(constructionObject => constructionObject.CompanyId == companyId);
    }

    private async Task<Domain.Entities.ConstructionObject> GetObjectAsync(Guid objectId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.ConstructionObjects
            .IgnoreQueryFilters()
            .SingleAsync(constructionObject => constructionObject.Id == objectId);
    }

    private static void AssertCustomerDto(JsonElement dto, string name, string? contactPerson, string? contactPhone)
    {
        dto.GetProperty("id").GetGuid().Should().NotBeEmpty();
        dto.GetProperty("name").GetString().Should().Be(name);
        AssertNullableString(dto, "contactPerson", contactPerson);
        AssertNullableString(dto, "contactPhone", contactPhone);
    }

    private static void AssertObjectDto(
        JsonElement dto,
        string name,
        Guid customerId,
        string? address,
        ConstructionObjectStatus status,
        string? startDate,
        string? plannedEndDate,
        string? actualEndDate,
        decimal? budget)
    {
        dto.GetProperty("id").GetGuid().Should().NotBeEmpty();
        dto.GetProperty("name").GetString().Should().Be(name);
        dto.GetProperty("customerId").GetGuid().Should().Be(customerId);
        dto.GetProperty("status").GetString().Should().Be(status.ToString());
        AssertNullableString(dto, "address", address);
        AssertNullableString(dto, "startDate", startDate);
        AssertNullableString(dto, "plannedEndDate", plannedEndDate);
        AssertNullableString(dto, "actualEndDate", actualEndDate);

        var budgetElement = dto.GetProperty("budget");
        if (budget is null)
            budgetElement.ValueKind.Should().Be(JsonValueKind.Null);
        else
            budgetElement.GetDecimal().Should().Be(budget.Value);
    }

    private static void AssertPagedContract(JsonElement dto, int page, int pageSize, int totalCount)
    {
        dto.TryGetProperty("items", out _).Should().BeTrue();
        dto.GetProperty("page").GetInt32().Should().Be(page);
        dto.GetProperty("pageSize").GetInt32().Should().Be(pageSize);
        dto.GetProperty("totalCount").GetInt32().Should().Be(totalCount);
    }

    private static void AssertNullableString(JsonElement dto, string propertyName, string? expected)
    {
        var property = dto.GetProperty(propertyName);
        if (expected is null)
            property.ValueKind.Should().Be(JsonValueKind.Null);
        else
            property.GetString().Should().Be(expected);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

// These tests deliberately use the full HTTP pipeline rather than invoking
// MediatR handlers directly: authentication, [Authorize] role gates, JSON
// binding, validation, Result-to-HTTP mapping, and tenant query filters are
// all part of the contract clients actually use.
[Collection(PostgresCollection.Name)]
public sealed class WorkOrdersHttpTests : IDisposable
{
    private readonly PostgresFixture _fixture;
    private readonly ApiTestFactory _factory;

    public WorkOrdersHttpTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _factory = new ApiTestFactory(fixture);
    }

    [Fact]
    public async Task Owner_can_create_list_and_get_work_order_with_expected_dto()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(_fixture);
        using var owner = ApiHttpTestSupport.CreateClient(_factory, seed.Owner, seed.Company.Id);

        using var createResponse = await owner.PostAsync(
            "/api/v1/work-orders",
            WorkOrderJson(seed, "Install facade", plannedQty: 25m, unitPrice: 175m));

        createResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var created = await ApiHttpTestSupport.ReadJsonAsync(createResponse);
        var workOrderId = created.RootElement.GetProperty("id").GetGuid();

        workOrderId.Should().NotBeEmpty();
        created.RootElement.GetProperty("code").GetString().Should().NotBeNullOrWhiteSpace();
        created.RootElement.GetProperty("objectId").GetGuid().Should().Be(seed.Object.Id);
        created.RootElement.GetProperty("brigadeId").GetGuid().Should().Be(seed.Brigade.Id);
        created.RootElement.GetProperty("title").GetString().Should().Be("Install facade");
        created.RootElement.GetProperty("unit").GetString().Should().Be("m2");
        created.RootElement.GetProperty("plannedQty").GetDecimal().Should().Be(25m);
        created.RootElement.GetProperty("unitPrice").GetDecimal().Should().Be(175m);
        created.RootElement.GetProperty("status").GetString().Should().Be(WorkOrderStatus.New.ToString());
        created.RootElement.GetProperty("createdByUserId").GetGuid().Should().Be(seed.Owner.Id);

        using var listResponse = await owner.GetAsync("/api/v1/work-orders?page=1&pageSize=20");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var listed = await ApiHttpTestSupport.ReadJsonAsync(listResponse);
        listed.RootElement.GetProperty("items").EnumerateArray()
            .Select(item => item.GetProperty("id").GetGuid())
            .Should().Contain(workOrderId);

        using var getResponse = await owner.GetAsync($"/api/v1/work-orders/{workOrderId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var fetched = await ApiHttpTestSupport.ReadJsonAsync(getResponse);
        fetched.RootElement.GetProperty("id").GetGuid().Should().Be(workOrderId);
        fetched.RootElement.GetProperty("status").GetString().Should().Be(WorkOrderStatus.New.ToString());
    }

    [Fact]
    public async Task Create_rejects_missing_or_foreign_object_and_brigade_without_creating_order()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(_fixture);
        using var owner = ApiHttpTestSupport.CreateClient(_factory, seed.Owner, seed.Company.Id);

        using (var unknownObject = await owner.PostAsync(
                   "/api/v1/work-orders",
                   ApiHttpTestSupport.Json(new
                   {
                       objectId = Guid.NewGuid(),
                       brigadeId = seed.Brigade.Id,
                       title = "Must not be created: missing object",
                       unit = "m2",
                       plannedQty = 1m,
                       unitPrice = 10m,
                       estimateItemId = (Guid?)null,
                       dueDate = (DateOnly?)null
                   })))
        {
            await ApiHttpTestSupport.AssertErrorAsync(unknownObject, HttpStatusCode.NotFound, "OBJECT_NOT_FOUND");
        }

        using (var foreignObject = await owner.PostAsync(
                   "/api/v1/work-orders",
                   WorkOrderJson(seed, "Must not be created: foreign object", objectId: seed.ForeignObject.Id)))
        {
            await ApiHttpTestSupport.AssertErrorAsync(foreignObject, HttpStatusCode.NotFound, "OBJECT_NOT_FOUND");
        }

        using (var foreignBrigade = await owner.PostAsync(
                   "/api/v1/work-orders",
                   WorkOrderJson(seed, "Must not be created: foreign brigade", brigadeId: seed.ForeignBrigade.Id)))
        {
            await ApiHttpTestSupport.AssertErrorAsync(foreignBrigade, HttpStatusCode.NotFound, "BRIGADE_NOT_FOUND");
        }

        await using var context = _fixture.CreateDbContext();
        var rejectedTitles = new[]
        {
            "Must not be created: missing object",
            "Must not be created: foreign object",
            "Must not be created: foreign brigade"
        };
        (await context.WorkOrders.IgnoreQueryFilters()
                .CountAsync(order => rejectedTitles.Contains(order.Title)))
            .Should().Be(0);
    }

    [Fact]
    public async Task Allowed_http_lifecycle_assigns_starts_submits_accepts_and_closes_once()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(_fixture);
        using var owner = ApiHttpTestSupport.CreateClient(_factory, seed.Owner, seed.Company.Id);
        using var brigadir = ApiHttpTestSupport.CreateClient(_factory, seed.Brigadir, seed.Company.Id);
        var workOrderId = await CreateWorkOrderAsync(seed, owner, "Full lifecycle order");

        await AssertStatusAsync(
            await owner.PostAsync($"/api/v1/work-orders/{workOrderId}/assign", ApiHttpTestSupport.Json(new { assignedDate = new DateOnly(2026, 7, 1) })),
            WorkOrderStatus.Assigned);
        await AssertStatusAsync(await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/start", content: null), WorkOrderStatus.InProgress);

        using (var progress = new MultipartFormDataContent())
        {
            progress.Add(new StringContent("25"), "reportedQty");
            progress.Add(new StringContent("Facade completed"), "comment");
            using var progressResponse = await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/progress", progress);
            progressResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            using var progressDto = await ApiHttpTestSupport.ReadJsonAsync(progressResponse);
            progressDto.RootElement.GetProperty("workOrderId").GetGuid().Should().Be(workOrderId);
            progressDto.RootElement.GetProperty("reportedQty").GetDecimal().Should().Be(25m);
        }

        await AssertStatusAsync(await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/submit", content: null), WorkOrderStatus.OnReview);
        await AssertStatusAsync(
            await owner.PostAsync($"/api/v1/work-orders/{workOrderId}/accept", ApiHttpTestSupport.Json(new { completedDate = new DateOnly(2026, 7, 2) })),
            WorkOrderStatus.Accepted);
        await AssertStatusAsync(await owner.PostAsync($"/api/v1/work-orders/{workOrderId}/close", content: null), WorkOrderStatus.Closed);

        using var logResponse = await owner.GetAsync($"/api/v1/work-orders/{workOrderId}/log");
        logResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var log = await ApiHttpTestSupport.ReadJsonAsync(logResponse);
        log.RootElement.EnumerateArray()
            .Select(item => item.GetProperty("toStatus").GetString())
            .Should().Equal(
                WorkOrderStatus.Assigned.ToString(),
                WorkOrderStatus.InProgress.ToString(),
                WorkOrderStatus.OnReview.ToString(),
                WorkOrderStatus.Accepted.ToString(),
                WorkOrderStatus.Closed.ToString());
    }

    [Fact]
    public async Task Rejection_rework_and_invalid_repeated_transitions_preserve_state_machine_invariants()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(_fixture);
        using var owner = ApiHttpTestSupport.CreateClient(_factory, seed.Owner, seed.Company.Id);
        using var brigadir = ApiHttpTestSupport.CreateClient(_factory, seed.Brigadir, seed.Company.Id);
        var workOrderId = await CreateWorkOrderAsync(seed, owner, "Reject and rework order");

        using (var invalidStart = await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/start", content: null))
        {
            await ApiHttpTestSupport.AssertErrorAsync(invalidStart, HttpStatusCode.BadRequest, "WORK_ORDER_INVALID_TRANSITION");
        }

        await AssertStatusAsync(
            await owner.PostAsync($"/api/v1/work-orders/{workOrderId}/assign", ApiHttpTestSupport.Json(new { assignedDate = new DateOnly(2026, 7, 1) })),
            WorkOrderStatus.Assigned);

        using (var repeatedAssign = await owner.PostAsync($"/api/v1/work-orders/{workOrderId}/assign", ApiHttpTestSupport.Json(new { assignedDate = new DateOnly(2026, 7, 1) })))
        {
            await ApiHttpTestSupport.AssertErrorAsync(repeatedAssign, HttpStatusCode.BadRequest, "WORK_ORDER_INVALID_TRANSITION");
        }

        await AssertStatusAsync(await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/start", content: null), WorkOrderStatus.InProgress);
        using (var progress = new MultipartFormDataContent())
        {
            progress.Add(new StringContent("1"), "reportedQty");
            using var progressResponse = await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/progress", progress);
            progressResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        await AssertStatusAsync(await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/submit", content: null), WorkOrderStatus.OnReview);

        using (var missingReason = await owner.PostAsync($"/api/v1/work-orders/{workOrderId}/reject", ApiHttpTestSupport.Json(new { reason = "" })))
        {
            await ApiHttpTestSupport.AssertErrorAsync(missingReason, HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        }

        await AssertStatusAsync(
            await owner.PostAsync($"/api/v1/work-orders/{workOrderId}/reject", ApiHttpTestSupport.Json(new { reason = "Quality issue" })),
            WorkOrderStatus.Rejected);
        await AssertStatusAsync(await brigadir.PostAsync($"/api/v1/work-orders/{workOrderId}/rework", content: null), WorkOrderStatus.InProgress);

        using var logResponse = await owner.GetAsync($"/api/v1/work-orders/{workOrderId}/log");
        logResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var log = await ApiHttpTestSupport.ReadJsonAsync(logResponse);
        var entries = log.RootElement.EnumerateArray().ToList();
        entries.Should().HaveCount(5, "the repeated /assign request must not create another transition log");
        entries[^2].GetProperty("toStatus").GetString().Should().Be(WorkOrderStatus.Rejected.ToString());
        entries[^2].GetProperty("comment").GetString().Should().Be("Quality issue");
        entries[^1].GetProperty("toStatus").GetString().Should().Be(WorkOrderStatus.InProgress.ToString());
    }

    [Fact]
    public async Task Jwt_role_policies_and_company_isolation_apply_to_work_order_endpoints()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(_fixture);
        using var owner = ApiHttpTestSupport.CreateClient(_factory, seed.Owner, seed.Company.Id);
        using var prorab = ApiHttpTestSupport.CreateClient(_factory, seed.Prorab, seed.Company.Id);
        using var brigadir = ApiHttpTestSupport.CreateClient(_factory, seed.Brigadir, seed.Company.Id);
        using var accountant = ApiHttpTestSupport.CreateClient(_factory, seed.Accountant, seed.Company.Id);
        using var foreignOwner = ApiHttpTestSupport.CreateClient(_factory, seed.ForeignOwner, seed.ForeignCompany.Id);
        using var anonymous = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });

        var workOrderId = await CreateWorkOrderAsync(seed, owner, "Isolation order");

        await using (var verifyCounterContext = _fixture.CreateDbContext())
        {
            var nextCodeNumber = await verifyCounterContext.Companies.IgnoreQueryFilters()
                .Where(company => company.Id == seed.Company.Id)
                .Select(company => company.NextCodeNumber)
                .SingleAsync();
            nextCodeNumber.Should().Be(2, "a successful work-order create must reserve and persist its company code");
        }

        // A Prorab with no assignments intentionally sees all company objects
        // (MASTER §1.2), so the policy allows this create request.
        using (var prorabCreate = await prorab.PostAsync("/api/v1/work-orders", WorkOrderJson(seed, "Prorab can create")))
        {
            prorabCreate.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        (await anonymous.GetAsync($"/api/v1/work-orders/{workOrderId}")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await brigadir.GetAsync("/api/v1/work-orders")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await brigadir.PostAsync("/api/v1/work-orders", WorkOrderJson(seed, "Brigadir cannot create"))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await accountant.GetAsync($"/api/v1/work-orders/{workOrderId}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await accountant.PostAsync($"/api/v1/work-orders/{workOrderId}/assign", ApiHttpTestSupport.Json(new { assignedDate = new DateOnly(2026, 7, 1) }))).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        using (var mine = await brigadir.GetAsync("/api/v1/work-orders/mine?page=1&pageSize=20"))
        {
            mine.StatusCode.Should().Be(HttpStatusCode.OK);
            using var mineBody = await ApiHttpTestSupport.ReadJsonAsync(mine);
            mineBody.RootElement.GetProperty("items").EnumerateArray()
                .Select(item => item.GetProperty("id").GetGuid())
                .Should().Contain(workOrderId);
        }

        using (var foreignGet = await foreignOwner.GetAsync($"/api/v1/work-orders/{workOrderId}"))
        {
            await ApiHttpTestSupport.AssertErrorAsync(foreignGet, HttpStatusCode.NotFound, "WORK_ORDER_NOT_FOUND");
        }

        using (var foreignAssign = await foreignOwner.PostAsync($"/api/v1/work-orders/{workOrderId}/assign", ApiHttpTestSupport.Json(new { assignedDate = new DateOnly(2026, 7, 1) })))
        {
            await ApiHttpTestSupport.AssertErrorAsync(foreignAssign, HttpStatusCode.NotFound, "WORK_ORDER_NOT_FOUND");
        }

        using (var foreignList = await foreignOwner.GetAsync("/api/v1/work-orders?page=1&pageSize=20"))
        {
            foreignList.StatusCode.Should().Be(HttpStatusCode.OK);
            using var listBody = await ApiHttpTestSupport.ReadJsonAsync(foreignList);
            listBody.RootElement.GetProperty("items").EnumerateArray()
                .Select(item => item.GetProperty("id").GetGuid())
                .Should().NotContain(workOrderId);
        }

        await using var context = _fixture.CreateDbContext();
        var storedStatus = await context.WorkOrders.IgnoreQueryFilters()
            .Where(order => order.Id == workOrderId)
            .Select(order => order.Status)
            .SingleAsync();
        storedStatus.Should().Be(WorkOrderStatus.New, "a foreign company's mutation must not reach the order");
    }

    // GET /work-orders/{id} had no HTTP-level test at all for the Brigadir
    // path (only the Prorab+/foreign-company angles were covered above) —
    // this is the exact "can a Brigadir open someone else's work order by
    // ID" question, over the real ASP.NET pipeline rather than the handler
    // directly.
    [Fact]
    public async Task Brigadir_can_open_their_own_brigades_order_by_id_but_not_a_different_brigades()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(_fixture);
        using var owner = ApiHttpTestSupport.CreateClient(_factory, seed.Owner, seed.Company.Id);
        using var brigadir = ApiHttpTestSupport.CreateClient(_factory, seed.Brigadir, seed.Company.Id);

        var ownOrderId = await CreateWorkOrderAsync(seed, owner, "Own brigade order");

        Guid otherBrigadeId;
        await using (var setupContext = _fixture.CreateDbContext())
        {
            var otherBrigade = Brigade.Create(seed.Company.Id, "Second brigade, same company");
            setupContext.Brigades.Add(otherBrigade);
            await setupContext.SaveChangesAsync(CancellationToken.None);
            otherBrigadeId = otherBrigade.Id;
        }

        using var otherOrderResponse = await owner.PostAsync(
            "/api/v1/work-orders",
            WorkOrderJson(seed, "Other brigade order", brigadeId: otherBrigadeId));
        otherOrderResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var otherOrderBody = await ApiHttpTestSupport.ReadJsonAsync(otherOrderResponse);
        var otherOrderId = otherOrderBody.RootElement.GetProperty("id").GetGuid();

        using (var ownGet = await brigadir.GetAsync($"/api/v1/work-orders/{ownOrderId}"))
        {
            ownGet.StatusCode.Should().Be(HttpStatusCode.OK);
            using var ownBody = await ApiHttpTestSupport.ReadJsonAsync(ownGet);
            ownBody.RootElement.GetProperty("id").GetGuid().Should().Be(ownOrderId);
        }

        using (var crossGet = await brigadir.GetAsync($"/api/v1/work-orders/{otherOrderId}"))
        {
            await ApiHttpTestSupport.AssertErrorAsync(crossGet, HttpStatusCode.NotFound, "WORK_ORDER_NOT_FOUND");
        }
    }

    [Fact]
    public async Task Brigade_endpoints_enforce_current_roles_validation_and_company_isolation()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(_fixture);
        using var owner = ApiHttpTestSupport.CreateClient(_factory, seed.Owner, seed.Company.Id);
        using var prorab = ApiHttpTestSupport.CreateClient(_factory, seed.Prorab, seed.Company.Id);
        using var brigadir = ApiHttpTestSupport.CreateClient(_factory, seed.Brigadir, seed.Company.Id);
        using var accountant = ApiHttpTestSupport.CreateClient(_factory, seed.Accountant, seed.Company.Id);
        using var foreignOwner = ApiHttpTestSupport.CreateClient(_factory, seed.ForeignOwner, seed.ForeignCompany.Id);

        using var createResponse = await owner.PostAsync("/api/v1/brigades", ApiHttpTestSupport.Json(new { name = "HTTP created brigade" }));
        createResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var created = await ApiHttpTestSupport.ReadJsonAsync(createResponse);
        var brigadeId = created.RootElement.GetProperty("id").GetGuid();
        created.RootElement.GetProperty("name").GetString().Should().Be("HTTP created brigade");
        created.RootElement.GetProperty("brigadirUserId").ValueKind.Should().Be(JsonValueKind.Null);
        created.RootElement.GetProperty("isActive").GetBoolean().Should().BeTrue();

        using (var prorabCreate = await prorab.PostAsync("/api/v1/brigades", ApiHttpTestSupport.Json(new { name = "Prorab created brigade" })))
        {
            prorabCreate.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        using (var invalid = await owner.PostAsync("/api/v1/brigades", ApiHttpTestSupport.Json(new { name = "" })))
        {
            await ApiHttpTestSupport.AssertErrorAsync(invalid, HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        }

        (await brigadir.PostAsync("/api/v1/brigades", ApiHttpTestSupport.Json(new { name = "Brigadir denied" }))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await accountant.GetAsync("/api/v1/brigades?page=1&pageSize=20")).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        using (var ownList = await owner.GetAsync("/api/v1/brigades?page=1&pageSize=50"))
        {
            ownList.StatusCode.Should().Be(HttpStatusCode.OK);
            using var listBody = await ApiHttpTestSupport.ReadJsonAsync(ownList);
            listBody.RootElement.GetProperty("items").EnumerateArray()
                .Select(item => item.GetProperty("id").GetGuid())
                .Should().Contain(brigadeId)
                .And.NotContain(seed.ForeignBrigade.Id);
        }

        using var foreignList = await foreignOwner.GetAsync("/api/v1/brigades?page=1&pageSize=50");
        foreignList.StatusCode.Should().Be(HttpStatusCode.OK);
        using var foreignBody = await ApiHttpTestSupport.ReadJsonAsync(foreignList);
        foreignBody.RootElement.GetProperty("items").EnumerateArray()
            .Select(item => item.GetProperty("id").GetGuid())
            .Should().NotContain(brigadeId);
    }

    public void Dispose() => _factory.Dispose();

    private static HttpContent WorkOrderJson(
        ApiHttpTestSeed seed,
        string title,
        Guid? objectId = null,
        Guid? brigadeId = null,
        decimal plannedQty = 10m,
        decimal unitPrice = 100m) =>
        ApiHttpTestSupport.Json(new
        {
            objectId = objectId ?? seed.Object.Id,
            brigadeId = brigadeId ?? seed.Brigade.Id,
            title,
            unit = "m2",
            plannedQty,
            unitPrice,
            estimateItemId = (Guid?)null,
            dueDate = new DateOnly(2026, 7, 31)
        });

    private static async Task<Guid> CreateWorkOrderAsync(ApiHttpTestSeed seed, HttpClient owner, string title)
    {
        using var response = await owner.PostAsync("/api/v1/work-orders", WorkOrderJson(seed, title));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var payload = await ApiHttpTestSupport.ReadJsonAsync(response);
        return payload.RootElement.GetProperty("id").GetGuid();
    }

    private static async Task AssertStatusAsync(HttpResponseMessage response, WorkOrderStatus expectedStatus)
    {
        using (response)
        {
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            using var payload = await ApiHttpTestSupport.ReadJsonAsync(response);
            payload.RootElement.GetProperty("status").GetString().Should().Be(expectedStatus.ToString());
        }
    }
}

using System.Net;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;

namespace Api.IntegrationTests;

// Real HTTP host coverage for the QR login pipeline — routing, [Authorize],
// and the anonymous endpoints' rate limiting together, not just the handlers
// in isolation (QrLoginSessionCommandTests covers those).
[Collection(PostgresCollection.Name)]
public sealed class QrLoginHttpTests(PostgresFixture fixture)
{
    private static HttpClient AnonymousClient(ApiTestFactory factory) => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        AllowAutoRedirect = false,
        BaseAddress = new Uri("https://localhost")
    });

    [Fact]
    public async Task Full_flow_start_scan_approve_exchange_then_auth_me_works_and_second_exchange_is_denied()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);
        using var anon = AnonymousClient(factory);
        using var mobile = ApiHttpTestSupport.CreateClient(factory, seed.Owner, seed.Company.Id);

        using var start = await anon.PostAsync("/api/v1/auth/qr/start", null);
        start.StatusCode.Should().Be(HttpStatusCode.OK);
        using var startBody = await ApiHttpTestSupport.ReadJsonAsync(start);
        var sessionId = startBody.RootElement.GetProperty("sessionId").GetGuid();
        var qrToken = startBody.RootElement.GetProperty("qrToken").GetString()!;
        startBody.RootElement.GetProperty("qrPayload").GetString().Should().Contain(sessionId.ToString());

        using var initialStatus = await anon.GetAsync($"/api/v1/auth/qr/{sessionId}/status");
        initialStatus.StatusCode.Should().Be(HttpStatusCode.OK);
        using var initialStatusBody = await ApiHttpTestSupport.ReadJsonAsync(initialStatus);
        initialStatusBody.RootElement.GetProperty("status").GetString().Should().Be("Pending");

        using var scan = await mobile.PostAsync($"/api/v1/auth/qr/{sessionId}/scan", ApiHttpTestSupport.Json(new { qrToken }));
        scan.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scannedStatus = await anon.GetAsync($"/api/v1/auth/qr/{sessionId}/status");
        using var scannedStatusBody = await ApiHttpTestSupport.ReadJsonAsync(scannedStatus);
        scannedStatusBody.RootElement.GetProperty("status").GetString().Should().Be("Scanned");

        using var approve = await mobile.PostAsync("/api/v1/auth/qr/approve", ApiHttpTestSupport.Json(new { sessionId, qrToken }));
        approve.StatusCode.Should().Be(HttpStatusCode.OK);

        using var approvedStatus = await anon.GetAsync($"/api/v1/auth/qr/{sessionId}/status");
        using var approvedStatusBody = await ApiHttpTestSupport.ReadJsonAsync(approvedStatus);
        approvedStatusBody.RootElement.GetProperty("status").GetString().Should().Be("Approved");

        using var exchange = await anon.PostAsync($"/api/v1/auth/qr/{sessionId}/exchange", ApiHttpTestSupport.Json(new { qrToken }));
        exchange.StatusCode.Should().Be(HttpStatusCode.OK);
        using var exchangeBody = await ApiHttpTestSupport.ReadJsonAsync(exchange);
        var accessToken = exchangeBody.RootElement.GetProperty("accessToken").GetString()!;
        exchangeBody.RootElement.GetProperty("role").GetString().Should().Be("Owner");

        using var meClient = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, BaseAddress = new Uri("https://localhost") });
        meClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        using var me = await meClient.GetAsync("/api/v1/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.OK);
        using var meBody = await ApiHttpTestSupport.ReadJsonAsync(me);
        meBody.RootElement.GetProperty("id").GetGuid().Should().Be(seed.Owner.Id);

        using var secondExchange = await anon.PostAsync($"/api/v1/auth/qr/{sessionId}/exchange", ApiHttpTestSupport.Json(new { qrToken }));
        await ApiHttpTestSupport.AssertErrorAsync(secondExchange, HttpStatusCode.BadRequest, "AUTH_QR_SESSION_INVALID");
    }

    [Fact]
    public async Task Scan_and_approve_require_authentication()
    {
        using var factory = new ApiTestFactory(fixture);
        using var anon = AnonymousClient(factory);

        using var scan = await anon.PostAsync($"/api/v1/auth/qr/{Guid.NewGuid()}/scan", ApiHttpTestSupport.Json(new { qrToken = "x" }));
        scan.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        using var approve = await anon.PostAsync("/api/v1/auth/qr/approve", ApiHttpTestSupport.Json(new { sessionId = Guid.NewGuid(), qrToken = "x" }));
        approve.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Approve_with_a_wrong_qrToken_is_rejected_through_the_real_pipeline()
    {
        var seed = await ApiHttpTestSupport.SeedAsync(fixture);
        using var factory = new ApiTestFactory(fixture);
        using var anon = AnonymousClient(factory);
        using var mobile = ApiHttpTestSupport.CreateClient(factory, seed.Owner, seed.Company.Id);

        using var start = await anon.PostAsync("/api/v1/auth/qr/start", null);
        using var startBody = await ApiHttpTestSupport.ReadJsonAsync(start);
        var sessionId = startBody.RootElement.GetProperty("sessionId").GetGuid();

        using var approve = await mobile.PostAsync("/api/v1/auth/qr/approve", ApiHttpTestSupport.Json(new { sessionId, qrToken = "not-the-real-token" }));
        await ApiHttpTestSupport.AssertErrorAsync(approve, HttpStatusCode.BadRequest, "AUTH_QR_SESSION_INVALID");
    }

    [Fact]
    public async Task Status_for_an_unknown_session_returns_404()
    {
        using var factory = new ApiTestFactory(fixture);
        using var anon = AnonymousClient(factory);

        using var status = await anon.GetAsync($"/api/v1/auth/qr/{Guid.NewGuid()}/status");
        await ApiHttpTestSupport.AssertErrorAsync(status, HttpStatusCode.NotFound, "AUTH_QR_SESSION_NOT_FOUND");
    }

    // ApiTestFactory runs the "Testing" environment (not "Development") on
    // purpose, so this also proves the endpoint is unreachable anywhere that
    // isn't explicitly Development — the same posture production has.
    [Fact]
    public async Task Dev_approve_endpoint_404s_outside_Development()
    {
        using var factory = new ApiTestFactory(fixture);
        using var anon = AnonymousClient(factory);

        using var devApprove = await anon.PostAsync("/api/v1/auth/qr/dev/approve", ApiHttpTestSupport.Json(new
        {
            sessionId = Guid.NewGuid(),
            qrToken = "x",
            phone = "+992900000000",
            password = "irrelevant"
        }));

        devApprove.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Stronger than "404s": proves the [DevelopmentOnly] convention actually
    // strips the action's route under the real "Production" environment name,
    // so the endpoint has no entry in the routing table at all — not an
    // endpoint that exists and refuses. A handler-level IsDevelopment() check
    // alone would still pass the two asserts below in the wrong way (the
    // action descriptor would still be present); this is what would catch
    // that regression.
    [Fact]
    public void Dev_approve_action_has_no_route_at_all_under_Production()
    {
        using var factory = new ApiTestFactory(fixture, "Production");

        var provider = factory.Services.GetRequiredService<IActionDescriptorCollectionProvider>();
        var devApproveAction = provider.ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .Where(a => a.ControllerName == "QrLogin" && a.ActionName == "DevApprove");

        devApproveAction.Should().BeEmpty();
    }

    // Positive control for the test above — proves the convention doesn't
    // just always strip the route regardless of environment.
    [Fact]
    public void Dev_approve_action_does_have_a_route_under_Development()
    {
        using var factory = new ApiTestFactory(fixture, "Development");

        var provider = factory.Services.GetRequiredService<IActionDescriptorCollectionProvider>();
        var devApproveAction = provider.ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .Where(a => a.ControllerName == "QrLogin" && a.ActionName == "DevApprove");

        devApproveAction.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Dev_approve_returns_404_through_routing_itself_under_Production()
    {
        using var factory = new ApiTestFactory(fixture, "Production");
        using var anon = AnonymousClient(factory);

        using var devApprove = await anon.PostAsync("/api/v1/auth/qr/dev/approve", ApiHttpTestSupport.Json(new
        {
            sessionId = Guid.NewGuid(),
            qrToken = "x",
            phone = "+992900000000",
            password = "irrelevant"
        }));

        devApprove.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

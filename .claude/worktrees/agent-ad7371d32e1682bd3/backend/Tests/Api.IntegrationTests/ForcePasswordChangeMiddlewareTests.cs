using System.Security.Claims;
using System.Text.Json;
using Api.Middleware;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.AspNetCore.Http;

namespace Api.IntegrationTests;

// Pure unit test — no DB, no container. MASTER §5.27: while
// User.ForcePasswordChange is set, every request except change-password/
// logout is rejected with 403 PASSWORD_CHANGE_REQUIRED.
public sealed class ForcePasswordChangeMiddlewareTests
{
    private static HttpContext BuildContext(string path, bool? forcePasswordChange, bool authenticated = true)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();

        if (authenticated)
        {
            var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) };
            if (forcePasswordChange is not null)
                claims.Add(new Claim(CurrentUserService.ForcePasswordChangeClaimType, forcePasswordChange.Value ? "true" : "false"));

            context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test"));
        }

        return context;
    }

    private static async Task<(bool NextCalled, HttpContext Context)> InvokeAsync(HttpContext context)
    {
        var nextCalled = false;
        var middleware = new ForcePasswordChangeMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);
        return (nextCalled, context);
    }

    [Fact]
    public async Task Blocks_non_allowed_path_when_force_password_change_is_set()
    {
        var context = BuildContext("/api/v1/objects", forcePasswordChange: true);

        var (nextCalled, result) = await InvokeAsync(context);

        nextCalled.Should().BeFalse();
        result.Response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);

        result.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(result.Response.Body);
        body.RootElement.GetProperty("error").GetProperty("code").GetString().Should().Be("PASSWORD_CHANGE_REQUIRED");
    }

    [Theory]
    [InlineData("/api/v1/auth/change-password")]
    [InlineData("/api/v1/auth/logout")]
    public async Task Allows_change_password_and_logout_when_force_password_change_is_set(string path)
    {
        var context = BuildContext(path, forcePasswordChange: true);

        var (nextCalled, result) = await InvokeAsync(context);

        nextCalled.Should().BeTrue();
        result.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task Allows_any_path_when_force_password_change_is_not_set()
    {
        var context = BuildContext("/api/v1/objects", forcePasswordChange: false);

        var (nextCalled, _) = await InvokeAsync(context);

        nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task Allows_unauthenticated_requests_through()
    {
        var context = BuildContext("/api/v1/objects", forcePasswordChange: null, authenticated: false);

        var (nextCalled, _) = await InvokeAsync(context);

        nextCalled.Should().BeTrue();
    }
}

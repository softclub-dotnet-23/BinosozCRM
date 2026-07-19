using Microsoft.AspNetCore.Mvc.Testing;

namespace Api.IntegrationTests;

// First HTTP-level test host in this project — every other test calls a
// MediatR handler directly, which never touches [Authorize]. This exists
// specifically to prove role-based endpoint restrictions actually reject a
// request at the ASP.NET Core pipeline level (Phase 5 Step 1, see
// PROGRESS.md).
//
// Config is supplied via process environment variables, not
// ConfigureWebHost/ConfigureAppConfiguration: Program.cs's
// AddInfrastructure(builder.Configuration) call reads the connection
// string EAGERLY, before builder.Build() runs, which is also before
// WebApplicationFactory's host-builder interception has a chance to layer
// in extra configuration sources — a ConfigureAppConfiguration override
// here is silently too late (confirmed: it left the connection string
// completely unset). Environment variables are read fresh by
// WebApplication.CreateBuilder(args) whenever Main() actually executes
// (deferred until CreateClient()/Server is first touched), so setting them
// here beforehand works — same mechanism PostgresFixture already uses for
// SEED_OWNER_*_PASSWORD.
public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public CustomWebApplicationFactory(string connectionString)
    {
        var jwt = AuthTestOptions.Jwt.Value;

        // "Testing", not "Development" — appsettings.Development.json
        // carries a real local-dev connection string that would otherwise
        // load and silently point this host at a real local database.
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", connectionString);
        Environment.SetEnvironmentVariable("Jwt__Issuer", jwt.Issuer);
        Environment.SetEnvironmentVariable("Jwt__Audience", jwt.Audience);
        Environment.SetEnvironmentVariable("Jwt__SecretKey", jwt.SecretKey);
        Environment.SetEnvironmentVariable("Jwt__AccessTokenMinutes", jwt.AccessTokenMinutes.ToString());
        Environment.SetEnvironmentVariable("Jwt__RefreshTokenDays", jwt.RefreshTokenDays.ToString());
        Environment.SetEnvironmentVariable("PhotoStorage__SigningKey", "this-is-a-test-only-signing-key-at-least-32-bytes");
        Environment.SetEnvironmentVariable("PhotoStorage__RootPath", Path.Combine(Path.GetTempPath(), "brigadacrm-test-photos"));
    }
}

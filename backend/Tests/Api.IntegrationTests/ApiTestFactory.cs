using System.Text;
using Api.Controllers;
using Application.Common.Interfaces;
using Infrastructure;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Interceptors;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace Api.IntegrationTests;

// Runs the real API pipeline (routing, JWT authentication, [Authorize],
// MediatR validation and Result-to-HTTP mapping) against the collection's
// PostgreSQL container. ObjectsController is a public type from Api, so the
// test host can discover that assembly without exposing Program solely for
// tests.
public sealed class ApiTestFactory(PostgresFixture fixture) : WebApplicationFactory<ObjectsController>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Minimal-host Program executes AddInfrastructure while the application
        // is first being built. ConfigureAppConfiguration is too late at that
        // point, so put every required test setting on the host builder before
        // Program runs. This keeps the tests independent of developer/CI
        // environment variables without committing a real connection string.
        builder
            .UseEnvironment("Testing")
            .UseSetting("ConnectionStrings:Default", fixture.ConnectionString)
            .UseSetting("Jwt:SecretKey", AuthTestOptions.Jwt.Value.SecretKey)
            .UseSetting("Jwt:Issuer", AuthTestOptions.Jwt.Value.Issuer)
            .UseSetting("Jwt:Audience", AuthTestOptions.Jwt.Value.Audience)
            .UseSetting("FileStorage:RootPath", Path.Combine(Path.GetTempPath(), "brigadacrm-api-integration-tests"))
            .UseSetting("FileStorage:SignedUrlSecret", "test-only-file-storage-secret-with-at-least-32-bytes");

        builder.ConfigureServices(services =>
        {
            // Minimal-host app services are registered before this callback,
            // so AddInfrastructure has already captured the developer/local
            // connection string. Replace that DbContext registration here;
            // otherwise AccountActiveMiddleware and endpoint handlers would
            // query a different database from the fixture the test seeded.
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<IApplicationDbContext>();
            services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
                options.UseNpgsql(fixture.ConnectionString, npgsql =>
                        npgsql.MigrationsAssembly(typeof(DependencyInjection).Assembly.FullName))
                    .AddInterceptors(
                        serviceProvider.GetRequiredService<AuditableEntitySaveChangesInterceptor>(),
                        serviceProvider.GetRequiredService<AdminAuditSaveChangesInterceptor>()));
            services.AddScoped<IApplicationDbContext>(serviceProvider =>
                serviceProvider.GetRequiredService<ApplicationDbContext>());

            // Background jobs are outside endpoint coverage and would mutate
            // the shared test database independently of a test request.
            services.RemoveAll<IHostedService>();

            // Minimal-host configuration is assembled before
            // WebApplicationFactory's test-host callbacks. PostConfigure the
            // bearer handler as well as adding the in-memory settings above,
            // so the actual JWT validation pipeline uses the same explicit
            // test credentials used by ApiHttpTestSupport.
            var jwt = AuthTestOptions.Jwt.Value;
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SecretKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });
        });
    }
}

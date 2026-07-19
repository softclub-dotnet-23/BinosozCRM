using System.Text;
using Api.Common;
using Api.Hubs;
using Api.Middleware;
using Api.RateLimiting;
using Api.Realtime;
using Application;
using Application.Common.Interfaces;
using Application.Common.Options;
using Application.Seed;
using Application.Workers;
using Domain.Entities;
using Infrastructure;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// MASTER §2/§3: Serilog, structured, no PII. Reads the "Serilog" appsettings
// section (MinimumLevel/WriteTo/Enrich) so log levels are config-driven, not
// hardcoded. §11.6's Worker PII (BirthDate, Phone, DocumentType,
// DocumentExpiryDate) plus PayRate now exist (Phase 1) — explicit
// Destructure.ByTransforming excludes them from anything logged via `{@Worker}`/
// `{@WorkerDto}`, independent of the API-response role-masking in WorkerDto
// itself (logs are a different exposure surface — retained longer, read by
// ops/devs regardless of the caller's role — so this isn't redundant with it).
builder.Host.UseSerilog((context, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .Destructure.ByTransforming<Worker>(w => new { w.Id, w.CompanyId, w.BrigadeId, w.UserId, w.FullName, w.IsActive })
    .Destructure.ByTransforming<WorkerDto>(w => new { w.Id, w.BrigadeId, w.UserId, w.FullName, w.IsActive }));

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // SignalR's browser client can't set an Authorization header on the
        // WebSocket handshake — it sends the access token as a query-string
        // parameter instead. Only accept that fallback for the hub's own
        // path, never for regular REST requests.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs/work-orders"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSignalR();
builder.Services.AddScoped<IWorkOrderRealtimeNotifier, SignalRWorkOrderNotifier>();

builder.Services.AddRateLimiter(options =>
{
    options.OnRejected = async (context, cancellationToken) => await ErrorEnvelope.WriteAsync(
        context.HttpContext,
        StatusCodes.Status429TooManyRequests,
        "RATE_LIMITED",
        "Too many login attempts. Try again later.",
        cancellationToken);

    options.AddPolicy(RateLimitPolicies.AuthLogin, httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var phone = httpContext.Items.TryGetValue(LoginRateLimitKeyMiddleware.PhoneItemKey, out var value)
            ? value as string
            : null;
        var partitionKey = $"{ip}:{phone ?? "unknown"}";

        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0
        });
    });
});

// MASTER §11.3: allow-list exactly the panel's origin(s), never AllowAnyOrigin
// together with credentials. No fallback default — an empty/missing config
// means an empty allow-list, not "allow everything".
const string corsPolicyName = "panel";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicyName, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();

    var seedDataService = scope.ServiceProvider.GetRequiredService<SeedDataService>();
    await seedDataService.SeedAsync(CancellationToken.None);
}

// Must be first: everything downstream can throw, and this is the only
// place that's allowed to turn an unhandled exception into a response.
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSerilogRequestLogging();

if (!app.Environment.IsDevelopment())
    app.UseHsts();

app.UseHttpsRedirection();
app.UseMiddleware<SecurityHeadersMiddleware>();

app.UseRouting();

app.UseCors(corsPolicyName);

app.UseMiddleware<LoginRateLimitKeyMiddleware>();

// UseRateLimiter() must come after UseRouting() — endpoint-specific policies
// (RequireRateLimiting/[EnableRateLimiting]) are resolved from routing
// metadata, which doesn't exist yet if the rate limiter runs first. Confirmed
// with a throwaway TestServer check: with the wrong order, the "auth-login"
// policy silently never applied and nothing was ever rate-limited.
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ForcePasswordChangeMiddleware>();

app.MapControllers();
app.MapHub<WorkOrdersHub>("/hubs/work-orders");

// /health = liveness only, no dependency checks (Predicate excludes all
// registered checks) — orchestrator just wants "is the process alive".
// /health/ready runs everything, i.e. the DB check, for "can it serve traffic".
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready");

app.Run();

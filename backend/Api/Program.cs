using System.Text;
using Api.Common;
using Api.Middleware;
using Api.RateLimiting;
using Application;
using Application.Common.Options;
using Application.Seed;
using Infrastructure;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

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
    });

builder.Services.AddAuthorization();

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

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();

    var seedDataService = scope.ServiceProvider.GetRequiredService<SeedDataService>();
    await seedDataService.SeedAsync(CancellationToken.None);
}

app.UseMiddleware<LoginRateLimitKeyMiddleware>();

// UseRateLimiter() must come after UseRouting() — endpoint-specific policies
// (RequireRateLimiting/[EnableRateLimiting]) are resolved from routing
// metadata, which doesn't exist yet if the rate limiter runs first. Confirmed
// with a throwaway TestServer check: with the wrong order, the "auth-login"
// policy silently never applied and nothing was ever rate-limited.
app.UseRouting();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ForcePasswordChangeMiddleware>();

app.MapControllers();

app.Run();

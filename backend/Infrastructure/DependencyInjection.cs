using System.Text;
using Application.Common.Interfaces;
using Application.Common.Options;
using Application.Seed;
using Infrastructure.Auth;
using Infrastructure.BackgroundJobs;
using Infrastructure.Files;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Interceptors;
using Infrastructure.Time;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        services.AddSingleton<AuditableEntitySaveChangesInterceptor>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<AdminAuditSaveChangesInterceptor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, npgsql =>
                    npgsql.MigrationsAssembly(typeof(DependencyInjection).Assembly.FullName))
                .AddInterceptors(
                    sp.GetRequiredService<AuditableEntitySaveChangesInterceptor>(),
                    sp.GetRequiredService<AdminAuditSaveChangesInterceptor>()));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IDistributedJobLock, PostgresDistributedJobLock>();

        // Business-date derivation must never depend on the server's local
        // time-zone setting. All persisted instants remain UTC.
        services.AddSingleton<TimeProvider>(TimeProvider.System);
        services.AddOptions<BusinessTimeOptions>()
            .Bind(configuration.GetSection(BusinessTimeOptions.SectionName))
            .Validate(o => string.Equals(o.TimeZoneId, BusinessTimeOptions.AsiaDushanbeTimeZoneId, StringComparison.Ordinal),
                "BusinessTime:TimeZoneId must be Asia/Dushanbe.")
            .Validate(HasValidTimeZone, "BusinessTime:TimeZoneId is not available on this host.")
            .ValidateOnStart();
        services.AddSingleton<IBusinessTimeProvider, BusinessTimeProvider>();

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(o => !string.IsNullOrEmpty(o.SecretKey) && Encoding.UTF8.GetByteCount(o.SecretKey) >= 32,
                "Jwt:SecretKey must be set and at least 32 bytes (MASTER §11.1) — never in a committed appsettings.json, use ENV/user-secrets.")
            .ValidateOnStart();

        services.AddScoped<IPasswordHasher, Argon2PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.Configure<SeedOptions>(configuration.GetSection(SeedOptions.SectionName));
        services.AddScoped<SeedDataService>();

        services.AddOptions<FileStorageOptions>()
            .Bind(configuration.GetSection(FileStorageOptions.SectionName))
            .Validate(o => !string.IsNullOrEmpty(o.RootPath), "FileStorage:RootPath must be set.")
            .Validate(o => !string.IsNullOrEmpty(o.SignedUrlSecret) && Encoding.UTF8.GetByteCount(o.SignedUrlSecret) >= 32,
                "FileStorage:SignedUrlSecret must be set and at least 32 bytes (MASTER §11.9) — never in a committed appsettings.json, use ENV/user-secrets.")
            .Validate(o => o.MaxFileSizeBytes > 0, "FileStorage:MaxFileSizeBytes must be positive.")
            .Validate(o => o.MaxPhotosPerProgress > 0, "FileStorage:MaxPhotosPerProgress must be positive.")
            .Validate(o => o.MaxTotalUploadSizeBytes >= o.MaxFileSizeBytes,
                "FileStorage:MaxTotalUploadSizeBytes must be at least MaxFileSizeBytes.")
            .ValidateOnStart();

        services.AddScoped<IFileStorageService, LocalFileStorageService>();

        return services;
    }

    private static bool HasValidTimeZone(BusinessTimeOptions options)
    {
        try
        {
            _ = TimeZoneInfo.FindSystemTimeZoneById(options.TimeZoneId);
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
            return false;
        }
        catch (InvalidTimeZoneException)
        {
            return false;
        }
    }
}

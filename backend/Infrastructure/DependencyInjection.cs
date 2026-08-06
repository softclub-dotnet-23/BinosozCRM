using System.Text;
using Application.Common.Interfaces;
using Application.Common.Options;
using Application.Seed;
using Infrastructure.Auth;
using Infrastructure.Files;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Interceptors;
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
            .ValidateOnStart();

        services.AddScoped<IFileStorageService, LocalFileStorageService>();

        return services;
    }
}

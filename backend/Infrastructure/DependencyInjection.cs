using Application.Common.Interfaces;
using Infrastructure.Auth;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Interceptors;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        services.AddSingleton<AuditableEntitySaveChangesInterceptor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, npgsql =>
                    npgsql.MigrationsAssembly(typeof(DependencyInjection).Assembly.FullName))
                .AddInterceptors(sp.GetRequiredService<AuditableEntitySaveChangesInterceptor>()));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        return services;
    }
}

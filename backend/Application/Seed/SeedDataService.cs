using Application.Common.Interfaces;
using Application.Common.Options;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Application.Seed;

// Runs at every startup, after MigrateAsync and before the host starts serving
// requests (MASTER §5.27). Idempotent: checks "already there?" before creating
// anything, so re-running on an already-seeded database is a silent no-op.
public sealed class SeedDataService(IApplicationDbContext context, IPasswordHasher passwordHasher, IOptions<SeedOptions> seedOptions)
{
    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        var options = seedOptions.Value;

        var companyExists = await context.Companies.AnyAsync(cancellationToken);
        if (!companyExists)
        {
            context.Companies.Add(Company.Create(options.Company.Id, options.Company.Name));
            await context.SaveChangesAsync(cancellationToken);
        }

        var anyOwnerExists = await context.Users.AnyAsync(u => u.Role == Role.Owner, cancellationToken);
        if (anyOwnerExists)
            return;

        for (var i = 0; i < options.Owners.Count; i++)
        {
            var ownerOptions = options.Owners[i];
            var envVarName = $"SEED_OWNER_{i + 1}_PASSWORD";
            var password = Environment.GetEnvironmentVariable(envVarName);

            if (string.IsNullOrEmpty(password))
                throw new InvalidOperationException($"{envVarName} is not set — cannot seed Owner accounts.");

            var owner = User.Create(
                ownerOptions.FullName,
                ownerOptions.Phone,
                passwordHasher.Hash(password),
                Role.Owner,
                forcePasswordChange: true);

            context.Users.Add(owner);
        }

        await context.SaveChangesAsync(cancellationToken);
    }
}

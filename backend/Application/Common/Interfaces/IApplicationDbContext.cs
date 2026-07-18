using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Company> Companies { get; }
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Brigade> Brigades { get; }
    DbSet<Worker> Workers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

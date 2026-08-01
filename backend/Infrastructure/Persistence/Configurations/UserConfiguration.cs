using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.CompanyId).IsRequired();
        builder.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(20).IsRequired();
        builder.Property(x => x.PasswordHash).IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        // Login currently takes only a phone number, not a company selector,
        // so its uniqueness must remain global. Tenant ownership is enforced
        // by CompanyId after the identity has been resolved.
        builder.HasIndex(x => x.Phone).IsUnique();
        builder.HasIndex(x => x.CompanyId);

        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
    }
}

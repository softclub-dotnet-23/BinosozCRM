using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.DefaultCurrency).HasMaxLength(3).IsRequired();
        // EF's migration generator uses default(int) = 0 for the ADD COLUMN
        // default, not the CLR property initializer — without this explicit
        // default, every already-seeded Company would backfill to 0, and
        // its first WorkOrder/IndividualTask would be "BR-0", not "BR-1".
        builder.Property(x => x.NextCodeNumber).HasDefaultValue(1);
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.Property<uint>("xmin").HasColumnName("xmin").HasColumnType("xid").IsRowVersion();
    }
}

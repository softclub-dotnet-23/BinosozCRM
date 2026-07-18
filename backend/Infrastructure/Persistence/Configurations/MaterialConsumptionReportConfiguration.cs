using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class MaterialConsumptionReportConfiguration : IEntityTypeConfiguration<MaterialConsumptionReport>
{
    public void Configure(EntityTypeBuilder<MaterialConsumptionReport> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.MaterialName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Unit).HasMaxLength(20).IsRequired();
        builder.Property(x => x.QtyUsed).HasColumnType("decimal(18,3)");
        builder.Property(x => x.QtyShortage).HasColumnType("decimal(18,3)");
        builder.Property(x => x.Date).HasColumnType("date");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => new { x.BrigadeId, x.ObjectId, x.MaterialName, x.Date }).IsUnique();
    }
}

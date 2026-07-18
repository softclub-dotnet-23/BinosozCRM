using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class WorkOrderProgressConfiguration : IEntityTypeConfiguration<WorkOrderProgress>
{
    public void Configure(EntityTypeBuilder<WorkOrderProgress> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.ReportedQty).HasColumnType("decimal(18,3)");
        builder.Property(x => x.PhotoUrls).HasColumnType("jsonb");
        builder.Property(x => x.ReportedAt).HasColumnType("timestamptz");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => x.WorkOrderId);
    }
}

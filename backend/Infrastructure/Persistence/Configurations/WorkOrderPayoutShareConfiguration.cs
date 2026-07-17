using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class WorkOrderPayoutShareConfiguration : IEntityTypeConfiguration<WorkOrderPayoutShare>
{
    public void Configure(EntityTypeBuilder<WorkOrderPayoutShare> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.SharePercent).HasColumnType("decimal(5,2)");
        builder.Property(x => x.Amount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => x.WorkOrderId);
        builder.HasIndex(x => x.WorkerId);
    }
}

using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class WorkerPayRateHistoryConfiguration : IEntityTypeConfiguration<WorkerPayRateHistory>
{
    public void Configure(EntityTypeBuilder<WorkerPayRateHistory> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.PayRate).HasColumnType("decimal(18,2)");
        builder.Property(x => x.EffectiveFrom).HasColumnType("date");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_WorkerPayRateHistories_PayRate_ByType",
            "(\"PayRateType\" = 0 AND \"PayRate\" > 0) OR (\"PayRateType\" = 1 AND \"PayRate\" >= 0)"));
        builder.HasIndex(x => new { x.WorkerId, x.EffectiveFrom }).IsUnique();
        builder.HasIndex(x => x.CompanyId);
        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Worker>().WithMany().HasForeignKey(x => x.WorkerId).OnDelete(DeleteBehavior.Restrict);
    }
}

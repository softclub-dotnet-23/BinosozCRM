using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class PayrollEntryConfiguration : IEntityTypeConfiguration<PayrollEntry>
{
    public void Configure(EntityTypeBuilder<PayrollEntry> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.PeriodStart).HasColumnType("date");
        builder.Property(x => x.PeriodEnd).HasColumnType("date");
        builder.Property(x => x.CalculatedAmount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.LatenessDeductionAmount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.BonusAmount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.AdvanceDeductedAmount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.AdjustmentAmount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.AdjustmentReason).HasMaxLength(500);
        builder.Property(x => x.FinalAmount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.PaidAt).HasColumnType("timestamptz");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => new { x.WorkerId, x.PeriodStart, x.PeriodEnd }).IsUnique();

        builder.Property<uint>("xmin").HasColumnName("xmin").HasColumnType("xid").IsRowVersion();

        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Worker>().WithMany().HasForeignKey(x => x.WorkerId).OnDelete(DeleteBehavior.Restrict);
    }
}

using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class PayrollAdvanceConfiguration : IEntityTypeConfiguration<PayrollAdvance>
{
    public void Configure(EntityTypeBuilder<PayrollAdvance> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Amount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.IssuedAt).HasColumnType("timestamptz");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => new { x.WorkerId, x.SettledInPayrollEntryId });

        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Worker>().WithMany().HasForeignKey(x => x.WorkerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.IssuedByUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PayrollEntry>().WithMany().HasForeignKey(x => x.SettledInPayrollEntryId).OnDelete(DeleteBehavior.Restrict);
    }
}

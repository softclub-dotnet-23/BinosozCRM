using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class QrLoginSessionConfiguration : IEntityTypeConfiguration<QrLoginSession>
{
    public void Configure(EntityTypeBuilder<QrLoginSession> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.TokenHash).IsRequired();
        builder.Property(x => x.CreatedByIp).IsRequired();
        builder.Property(x => x.ExpiresAt).HasColumnType("timestamptz");
        builder.Property(x => x.ApprovedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ExchangedAt).HasColumnType("timestamptz");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => x.TokenHash).IsUnique();

        // Approve and Exchange are both read-check-then-write on this same row
        // (Pending/Scanned -> Approved, Approved+ExchangedAt==null -> exchanged)
        // with no other uniqueness constraint stopping two concurrent requests
        // from both passing the check before either commits. xmin (same
        // pattern as WorkOrder/PayrollEntry/Company/IndividualTask) makes
        // SaveChangesAsync's UPDATE conditional on the row being unchanged
        // since it was read — a second concurrent writer gets zero rows
        // affected, which EF Core surfaces as DbUpdateConcurrencyException.
        // Api/Middleware/ExceptionHandlingMiddleware.cs already turns that into
        // 409 CONCURRENCY_CONFLICT globally, so no handler-level catch is
        // needed here — only one of two concurrent approvers/exchangers can
        // ever win.
        builder.Property<uint>("xmin").HasColumnName("xmin").HasColumnType("xid").IsRowVersion();

        // No FK to User/Company — deliberately nullable and unenforced at the DB
        // level, since a Pending session has neither yet, and Restrict-on-delete
        // FKs to User would need to tolerate that.
    }
}

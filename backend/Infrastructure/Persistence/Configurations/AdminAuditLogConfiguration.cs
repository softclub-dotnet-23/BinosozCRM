using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class AdminAuditLogConfiguration : IEntityTypeConfiguration<AdminAuditLog>
{
    public void Configure(EntityTypeBuilder<AdminAuditLog> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Action).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.TargetEntityType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Ip).HasMaxLength(45);
        builder.Property(x => x.At).HasColumnType("timestamptz");

        builder.HasIndex(x => new { x.CompanyId, x.At });
        builder.HasIndex(x => new { x.ActorUserId, x.At });

        // TargetEntityId is deliberately NOT an FK — polymorphic, discriminated by
        // TargetEntityType, target table varies per row.
        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.ActorUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class TaskLogConfiguration : IEntityTypeConfiguration<TaskLog>
{
    public void Configure(EntityTypeBuilder<TaskLog> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.EntityType).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.FromStatus).HasMaxLength(20).IsRequired();
        builder.Property(x => x.ToStatus).HasMaxLength(20).IsRequired();
        builder.Property(x => x.ChangedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => new { x.EntityType, x.EntityId, x.ChangedAt });
    }
}

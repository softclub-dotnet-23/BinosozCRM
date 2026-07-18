using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class TelegramUpdateLogConfiguration : IEntityTypeConfiguration<TelegramUpdateLog>
{
    public void Configure(EntityTypeBuilder<TelegramUpdateLog> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.ProcessedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => x.UpdateId).IsUnique();
    }
}

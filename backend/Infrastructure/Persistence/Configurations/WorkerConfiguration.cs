using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class WorkerConfiguration : IEntityTypeConfiguration<Worker>
{
    public void Configure(EntityTypeBuilder<Worker> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Specialty).HasMaxLength(200);
        builder.Property(x => x.PayRate).HasColumnType("decimal(18,2)");
        builder.Property(x => x.DocumentType).HasMaxLength(100);
        builder.Property(x => x.BirthDate).HasColumnType("date");
        builder.Property(x => x.DocumentExpiryDate).HasColumnType("date");
        builder.Property(x => x.HireDate).HasColumnType("date");
        builder.Property(x => x.TerminationDate).HasColumnType("date");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => x.BrigadeId);
        builder.HasIndex(x => x.CompanyId);
        builder.HasIndex(x => x.DocumentExpiryDate).HasFilter("\"DocumentExpiryDate\" IS NOT NULL");

        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Brigade>().WithMany().HasForeignKey(x => x.BrigadeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}

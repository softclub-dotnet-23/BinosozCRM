using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class IssueReportConfiguration : IEntityTypeConfiguration<IssueReport>
{
    public void Configure(EntityTypeBuilder<IssueReport> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.PhotoUrl).HasMaxLength(500);
        builder.Property(x => x.ReportedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ResolvedAt).HasColumnType("timestamptz");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => x.CompanyId);
        builder.HasIndex(x => x.ObjectId);
        builder.HasIndex(x => x.ReportedByUserId);

        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ConstructionObject>().WithMany().HasForeignKey(x => x.ObjectId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<IndividualTask>().WithMany().HasForeignKey(x => x.IndividualTaskId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.ReportedByUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.ResolvedByUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

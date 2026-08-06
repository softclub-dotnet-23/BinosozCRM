using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class TimesheetConfiguration : IEntityTypeConfiguration<Timesheet>
{
    public void Configure(EntityTypeBuilder<Timesheet> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Date).HasColumnType("date");
        builder.Property(x => x.HoursWorked).HasColumnType("decimal(18,2)");
        builder.Property(x => x.CheckInAt).HasColumnType("timestamptz");
        builder.Property(x => x.CheckOutAt).HasColumnType("timestamptz");
        builder.Property(x => x.ApprovedAt).HasColumnType("timestamptz");
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        builder.Property(x => x.ModifiedAt).HasColumnType("timestamptz");

        builder.HasIndex(x => new { x.WorkerId, x.Date }).IsUnique();
        builder.HasIndex(x => new { x.ObjectId, x.Date });

        builder.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Worker>().WithMany().HasForeignKey(x => x.WorkerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ConstructionObject>().WithMany().HasForeignKey(x => x.ObjectId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<WorkOrderProgress>().WithMany().HasForeignKey(x => x.WorkOrderProgressId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

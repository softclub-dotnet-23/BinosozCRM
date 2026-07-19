using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Company> Companies { get; }
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Brigade> Brigades { get; }
    DbSet<Worker> Workers { get; }
    DbSet<Customer> Customers { get; }
    DbSet<ConstructionObject> ConstructionObjects { get; }
    DbSet<EstimateItem> EstimateItems { get; }
    DbSet<ProrabObjectAssignment> ProrabObjectAssignments { get; }
    DbSet<WorkOrder> WorkOrders { get; }
    DbSet<WorkOrderProgress> WorkOrderProgresses { get; }
    DbSet<WorkOrderPayoutShare> WorkOrderPayoutShares { get; }
    DbSet<IndividualTask> IndividualTasks { get; }
    DbSet<TaskLog> TaskLogs { get; }
    DbSet<Timesheet> Timesheets { get; }
    DbSet<AbsenceRecord> AbsenceRecords { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

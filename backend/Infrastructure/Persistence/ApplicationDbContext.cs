using Application.Common.Interfaces;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ConstructionObject> ConstructionObjects => Set<ConstructionObject>();
    public DbSet<EstimateItem> EstimateItems => Set<EstimateItem>();
    public DbSet<ProrabObjectAssignment> ProrabObjectAssignments => Set<ProrabObjectAssignment>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<WorkOrderProgress> WorkOrderProgresses => Set<WorkOrderProgress>();
    public DbSet<WorkOrderPayoutShare> WorkOrderPayoutShares => Set<WorkOrderPayoutShare>();
    public DbSet<IndividualTask> IndividualTasks => Set<IndividualTask>();
    public DbSet<TaskLog> TaskLogs => Set<TaskLog>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    public DbSet<Brigade> Brigades => Set<Brigade>();
    public DbSet<Worker> Workers => Set<Worker>();
    public DbSet<Timesheet> Timesheets => Set<Timesheet>();
    public DbSet<AbsenceRecord> AbsenceRecords => Set<AbsenceRecord>();
    public DbSet<MaterialRequest> MaterialRequests => Set<MaterialRequest>();
    public DbSet<MaterialConsumptionReport> MaterialConsumptionReports => Set<MaterialConsumptionReport>();
    public DbSet<MaterialDelivery> MaterialDeliveries => Set<MaterialDelivery>();
    public DbSet<PayrollEntry> PayrollEntries => Set<PayrollEntry>();
    public DbSet<PayrollAdvance> PayrollAdvances => Set<PayrollAdvance>();
    public DbSet<TelegramLink> TelegramLinks => Set<TelegramLink>();
    public DbSet<TelegramLinkCode> TelegramLinkCodes => Set<TelegramLinkCode>();
    public DbSet<TelegramUpdateLog> TelegramUpdateLogs => Set<TelegramUpdateLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}

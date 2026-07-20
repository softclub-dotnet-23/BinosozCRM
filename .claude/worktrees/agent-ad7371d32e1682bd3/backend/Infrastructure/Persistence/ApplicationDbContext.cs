using System.Linq.Expressions;
using System.Reflection;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ICurrentUserService currentUserService)
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

    // Read via a property (not a captured local) so EF Core's per-instance
    // substitution for global query filters applies — see OnModelCreating.
    // Unauthenticated/background access falls back to Guid.Empty, which never
    // matches a real Company.Id, so isolation fails closed, not open.
    private Guid CurrentCompanyId => currentUserService.CompanyId ?? Guid.Empty;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            var isCompanyOwned = typeof(ICompanyOwned).IsAssignableFrom(clrType);
            var isSoftDelete = typeof(ISoftDelete).IsAssignableFrom(clrType);

            if (!isCompanyOwned && !isSoftDelete)
                continue;

            var buildFilter = typeof(ApplicationDbContext)
                .GetMethod(nameof(BuildQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                .MakeGenericMethod(clrType);

            var filter = (LambdaExpression)buildFilter.Invoke(this, null)!;
            modelBuilder.Entity(clrType).HasQueryFilter(filter);
        }

        base.OnModelCreating(modelBuilder);
    }

    private LambdaExpression BuildQueryFilter<TEntity>() where TEntity : class
    {
        var parameter = Expression.Parameter(typeof(TEntity), "e");
        var self = Expression.Constant(this);
        Expression? body = null;

        if (typeof(ISoftDelete).IsAssignableFrom(typeof(TEntity)))
        {
            var isDeleted = Expression.Property(Expression.Convert(parameter, typeof(ISoftDelete)), nameof(ISoftDelete.IsDeleted));
            body = Expression.Not(isDeleted);
        }

        if (typeof(ICompanyOwned).IsAssignableFrom(typeof(TEntity)))
        {
            var companyId = Expression.Property(Expression.Convert(parameter, typeof(ICompanyOwned)), nameof(ICompanyOwned.CompanyId));
            var currentCompanyId = Expression.Property(self, nameof(CurrentCompanyId));
            var companyMatch = Expression.Equal(companyId, currentCompanyId);
            body = body is null ? companyMatch : Expression.AndAlso(body, companyMatch);
        }

        return Expression.Lambda(body!, parameter);
    }
}

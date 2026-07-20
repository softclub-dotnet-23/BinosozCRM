using System.Text.Json;
using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Infrastructure.Persistence.Interceptors;

// MASTER §5.16/§11.7: AdminAuditLog is about power, not business transitions
// (that's TaskLog) — smена роли, деактивация, назначение бригадира,
// изменение PayRate. An interceptor, not a call in each handler, so this
// keeps auditing even for call sites that don't exist yet (no MASTER §9.4
// endpoint currently changes Role/IsActive/PayRate directly) and can never
// be forgotten at a future one — the same "missed check is 🔴" risk
// AGENTS.md calls out for isolation applies here.
//
// Scoped, not Singleton (unlike AuditableEntitySaveChangesInterceptor) —
// needs ICurrentUserService (Scoped) for ActorUserId/CompanyId.
public sealed class AdminAuditSaveChangesInterceptor(ICurrentUserService currentUser, IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        AppendAuditEntries(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        AppendAuditEntries(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void AppendAuditEntries(DbContext? context)
    {
        if (context is null)
            return;

        // No authenticated actor (e.g. SeedData at startup) — nothing to
        // attribute the change to, so nothing to audit.
        if (currentUser.CompanyId is not { } companyId || currentUser.UserId is not { } actorUserId)
            return;

        var now = DateTimeOffset.UtcNow;
        var ip = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
        var entriesToAdd = new List<AdminAuditLog>();

        // Materialize each Entries<T>() query before mutating the tracker —
        // adding AdminAuditLog rows mid-enumeration would otherwise risk a
        // "collection modified" failure.
        foreach (var entry in context.ChangeTracker.Entries<User>().Where(e => e.State == EntityState.Modified).ToList())
        {
            var roleProperty = entry.Property(nameof(User.Role));
            if (roleProperty.IsModified)
            {
                entriesToAdd.Add(AdminAuditLog.Create(
                    companyId, actorUserId, AdminAuditAction.RoleChanged, nameof(User), entry.Entity.Id, now,
                    ToJson(roleProperty.OriginalValue), ToJson(roleProperty.CurrentValue), ip));
            }

            var isActiveProperty = entry.Property(nameof(User.IsActive));
            if (isActiveProperty.IsModified && Equals(isActiveProperty.OriginalValue, true) && Equals(isActiveProperty.CurrentValue, false))
            {
                entriesToAdd.Add(AdminAuditLog.Create(
                    companyId, actorUserId, AdminAuditAction.UserDeactivated, nameof(User), entry.Entity.Id, now,
                    ToJson(true), ToJson(false), ip));
            }
        }

        foreach (var entry in context.ChangeTracker.Entries<Worker>().Where(e => e.State == EntityState.Modified).ToList())
        {
            // §11.7: "Изменение PayRate пишется всегда" — no threshold, every change.
            var payRateProperty = entry.Property(nameof(Worker.PayRate));
            if (payRateProperty.IsModified)
            {
                entriesToAdd.Add(AdminAuditLog.Create(
                    companyId, actorUserId, AdminAuditAction.PayRateChanged, nameof(Worker), entry.Entity.Id, now,
                    ToJson(payRateProperty.OriginalValue), ToJson(payRateProperty.CurrentValue), ip));
            }
        }

        foreach (var entry in context.ChangeTracker.Entries<Brigade>().Where(e => e.State == EntityState.Modified).ToList())
        {
            var brigadirProperty = entry.Property(nameof(Brigade.BrigadirUserId));
            if (brigadirProperty.IsModified)
            {
                entriesToAdd.Add(AdminAuditLog.Create(
                    companyId, actorUserId, AdminAuditAction.BrigadirAssigned, nameof(Brigade), entry.Entity.Id, now,
                    ToJson(brigadirProperty.OriginalValue), ToJson(brigadirProperty.CurrentValue), ip));
            }
        }

        if (entriesToAdd.Count > 0)
            context.Set<AdminAuditLog>().AddRange(entriesToAdd);
    }

    private static string ToJson(object? value) => JsonSerializer.Serialize(new { value = value?.ToString() });
}

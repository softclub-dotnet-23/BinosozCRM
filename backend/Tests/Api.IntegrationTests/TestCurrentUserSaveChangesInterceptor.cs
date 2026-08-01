using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Api.IntegrationTests;

// Test-only identity infrastructure. Production FK constraints correctly
// require audit actors to exist; direct-handler tests model an authenticated
// caller with FixedCurrentUserService, so ensure that caller has a real row
// before a command persists its audit reference.
public sealed class TestCurrentUserSaveChangesInterceptor(ICurrentUserService currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        EnsureActor(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        await EnsureActorAsync(eventData.Context, cancellationToken);
        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void EnsureActor(DbContext? context)
    {
        if (context is null || currentUser.UserId is not { } userId || HasTrackedActor(context, userId))
            return;

        if (!context.Set<User>().IgnoreQueryFilters().Any(u => u.Id == userId))
            AddActor(context, userId);
    }

    private async Task EnsureActorAsync(DbContext? context, CancellationToken cancellationToken)
    {
        if (context is null || currentUser.UserId is not { } userId || HasTrackedActor(context, userId))
            return;

        if (!await context.Set<User>().IgnoreQueryFilters().AnyAsync(u => u.Id == userId, cancellationToken))
            AddActor(context, userId);
    }

    private static bool HasTrackedActor(DbContext context, Guid userId) =>
        context.ChangeTracker.Entries<User>().Any(e => e.Entity.Id == userId && e.State != EntityState.Deleted);

    private void AddActor(DbContext context, Guid userId)
    {
        var actor = User.Create(
            "Test actor",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            "test-hash",
            currentUser.Role ?? Role.Owner);

        // Entity.Id is protected in the domain, as it should be. EF's tracked
        // property API lets test infrastructure faithfully materialize the ID
        // represented by the authenticated test context without exposing a
        // test-only public domain setter.
        context.Entry(actor).Property(nameof(Entity.Id)).CurrentValue = userId;
        context.Set<User>().Add(actor);
    }
}

using Application.Common.Interfaces;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.7 point 5: "Подтверждённая -> PayrollEntry.BonusAmount
// периода по CompletedAt." Only tasks with a confirmed bonus
// (BonusApprovedByUserId != null — an unconfirmed draft "в зарплату не
// попадает," point 3) whose CompletedAt falls inside the period count.
internal static class BonusAmountCalculator
{
    public static async Task<decimal> ComputeAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly periodStart,
        DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        var confirmedBonusTasks = await context.IndividualTasks
            .Where(t => t.AssignedToWorkerId == worker.Id
                        && t.BonusApprovedByUserId != null
                        && t.BonusAmount != null
                        && t.CompletedAt != null)
            .ToListAsync(cancellationToken);

        return confirmedBonusTasks
            .Where(t => DateOnly.FromDateTime(t.CompletedAt!.Value.UtcDateTime) is var completedDate
                        && completedDate >= periodStart && completedDate <= periodEnd)
            .Sum(t => t.BonusAmount!.Value);
    }
}

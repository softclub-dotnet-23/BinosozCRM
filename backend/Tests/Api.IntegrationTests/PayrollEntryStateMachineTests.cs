using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §7.4: exactly Draft -> Approved -> Paid. These are domain tests so
// every caller (HTTP, hosted job, or future bot) gets the same protection.
public sealed class PayrollEntryStateMachineTests
{
    private static PayrollEntry NewDraft() => PayrollEntry.Create(
        Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 31));

    [Fact]
    public void Draft_can_be_approved_then_paid_and_final_amount_stays_fixed()
    {
        var entry = NewDraft();
        entry.UpdateDraft(100m, 5m, 10m, 20m).IsSuccess.Should().BeTrue();

        entry.Approve().IsSuccess.Should().BeTrue();
        entry.Status.Should().Be(PayrollEntryStatus.Approved);
        entry.FinalAmount.Should().Be(85m);

        entry.Pay(DateTimeOffset.UtcNow).IsSuccess.Should().BeTrue();
        entry.Status.Should().Be(PayrollEntryStatus.Paid);
        entry.FinalAmount.Should().Be(85m);
    }

    [Fact]
    public void Pay_from_draft_is_rejected()
    {
        var entry = NewDraft();

        var result = entry.Pay(DateTimeOffset.UtcNow);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PAYROLL_ENTRY_INVALID_TRANSITION");
        entry.Status.Should().Be(PayrollEntryStatus.Draft);
    }

    [Fact]
    public void Approved_and_paid_entries_cannot_be_changed()
    {
        var entry = NewDraft();
        entry.Approve();

        entry.UpdateDraft(1m, 0m, 0m, 0m).Error.Code.Should().Be("PAYROLL_ENTRY_NOT_DRAFT");
        entry.Adjust(1m, "late correction").Error.Code.Should().Be("PAYROLL_ENTRY_NOT_DRAFT");

        entry.Pay(DateTimeOffset.UtcNow);
        entry.Approve().Error.Code.Should().Be("PAYROLL_ENTRY_INVALID_TRANSITION");
        entry.Pay(DateTimeOffset.UtcNow).Error.Code.Should().Be("PAYROLL_ENTRY_INVALID_TRANSITION");
    }
}

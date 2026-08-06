using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §7.1 — the full WorkOrder state machine, exercised directly
// against the entity (no DB, no handler): every allowed edge and every
// disallowed edge from every reachable state. Handler-level isolation
// (Prorab/Brigadir scoping, TaskLog persistence) is covered separately in
// WorkOrderIsolationTests — this file is only about the state machine
// itself, including Rework/Close which have no API handler yet (Phase 2
// only wired Assign/Start/Submit/Accept/Reject).
public sealed class WorkOrderStateMachineTests
{
    private static WorkOrder NewOrder() => WorkOrder.Create(
        Guid.NewGuid(), "BR-1", Guid.NewGuid(), Guid.NewGuid(), "Title", "m2", 10, 100, Guid.NewGuid());

    [Fact]
    public void Full_happy_path_new_to_closed()
    {
        var order = NewOrder();
        order.Status.Should().Be(WorkOrderStatus.New);

        order.Assign(DateOnly.FromDateTime(DateTime.UtcNow)).IsSuccess.Should().BeTrue();
        order.Status.Should().Be(WorkOrderStatus.Assigned);

        order.Start().IsSuccess.Should().BeTrue();
        order.Status.Should().Be(WorkOrderStatus.InProgress);

        order.SubmitForReview(hasProgress: true, payoutShareComplete: true).IsSuccess.Should().BeTrue();
        order.Status.Should().Be(WorkOrderStatus.OnReview);

        order.Accept(DateOnly.FromDateTime(DateTime.UtcNow)).IsSuccess.Should().BeTrue();
        order.Status.Should().Be(WorkOrderStatus.Accepted);

        order.Close().IsSuccess.Should().BeTrue();
        order.Status.Should().Be(WorkOrderStatus.Closed);
    }

    [Fact]
    public void Reject_then_rework_returns_to_in_progress()
    {
        var order = NewOrder();
        order.Assign(DateOnly.FromDateTime(DateTime.UtcNow));
        order.Start();
        order.SubmitForReview(hasProgress: true, payoutShareComplete: true);

        order.Reject().IsSuccess.Should().BeTrue();
        order.Status.Should().Be(WorkOrderStatus.Rejected);

        order.Rework().IsSuccess.Should().BeTrue();
        order.Status.Should().Be(WorkOrderStatus.InProgress);
    }

    [Fact]
    public void Submit_without_progress_is_rejected()
    {
        var order = NewOrder();
        order.Assign(DateOnly.FromDateTime(DateTime.UtcNow));
        order.Start();

        var result = order.SubmitForReview(hasProgress: false, payoutShareComplete: true);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_NO_PROGRESS");
        order.Status.Should().Be(WorkOrderStatus.InProgress);
    }

    [Fact]
    public void Submit_with_incomplete_payout_shares_is_rejected()
    {
        var order = NewOrder();
        order.Assign(DateOnly.FromDateTime(DateTime.UtcNow));
        order.Start();

        var result = order.SubmitForReview(hasProgress: true, payoutShareComplete: false);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_SHARES_INVALID");
        order.Status.Should().Be(WorkOrderStatus.InProgress);
    }

    [Theory]
    [InlineData(WorkOrderStatus.Assigned)]
    [InlineData(WorkOrderStatus.InProgress)]
    [InlineData(WorkOrderStatus.OnReview)]
    [InlineData(WorkOrderStatus.Accepted)]
    [InlineData(WorkOrderStatus.Rejected)]
    [InlineData(WorkOrderStatus.Closed)]
    public void Assign_is_rejected_from_every_state_except_new(WorkOrderStatus reachedVia)
    {
        var order = DriveTo(reachedVia);
        var statusBefore = order.Status;

        var result = order.Assign(DateOnly.FromDateTime(DateTime.UtcNow));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_INVALID_TRANSITION");
        order.Status.Should().Be(statusBefore);
    }

    [Theory]
    [InlineData(WorkOrderStatus.New)]
    [InlineData(WorkOrderStatus.InProgress)]
    [InlineData(WorkOrderStatus.OnReview)]
    [InlineData(WorkOrderStatus.Accepted)]
    [InlineData(WorkOrderStatus.Rejected)]
    [InlineData(WorkOrderStatus.Closed)]
    public void Start_is_rejected_from_every_state_except_assigned(WorkOrderStatus reachedVia)
    {
        var order = DriveTo(reachedVia);
        var statusBefore = order.Status;

        var result = order.Start();

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_INVALID_TRANSITION");
        order.Status.Should().Be(statusBefore);
    }

    [Theory]
    [InlineData(WorkOrderStatus.New)]
    [InlineData(WorkOrderStatus.Assigned)]
    [InlineData(WorkOrderStatus.OnReview)]
    [InlineData(WorkOrderStatus.Accepted)]
    [InlineData(WorkOrderStatus.Rejected)]
    [InlineData(WorkOrderStatus.Closed)]
    public void Submit_is_rejected_from_every_state_except_in_progress(WorkOrderStatus reachedVia)
    {
        var order = DriveTo(reachedVia);
        var statusBefore = order.Status;

        var result = order.SubmitForReview(hasProgress: true, payoutShareComplete: true);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_INVALID_TRANSITION");
        order.Status.Should().Be(statusBefore);
    }

    [Theory]
    [InlineData(WorkOrderStatus.New)]
    [InlineData(WorkOrderStatus.Assigned)]
    [InlineData(WorkOrderStatus.InProgress)]
    [InlineData(WorkOrderStatus.Accepted)]
    [InlineData(WorkOrderStatus.Rejected)]
    [InlineData(WorkOrderStatus.Closed)]
    public void Accept_and_reject_are_rejected_from_every_state_except_on_review(WorkOrderStatus reachedVia)
    {
        var acceptOrder = DriveTo(reachedVia);
        var acceptStatusBefore = acceptOrder.Status;
        var acceptResult = acceptOrder.Accept(DateOnly.FromDateTime(DateTime.UtcNow));
        acceptResult.IsFailure.Should().BeTrue();
        acceptResult.Error.Code.Should().Be("WORK_ORDER_INVALID_TRANSITION");
        acceptOrder.Status.Should().Be(acceptStatusBefore);

        var rejectOrder = DriveTo(reachedVia);
        var rejectStatusBefore = rejectOrder.Status;
        var rejectResult = rejectOrder.Reject();
        rejectResult.IsFailure.Should().BeTrue();
        rejectResult.Error.Code.Should().Be("WORK_ORDER_INVALID_TRANSITION");
        rejectOrder.Status.Should().Be(rejectStatusBefore);
    }

    [Theory]
    [InlineData(WorkOrderStatus.New)]
    [InlineData(WorkOrderStatus.Assigned)]
    [InlineData(WorkOrderStatus.InProgress)]
    [InlineData(WorkOrderStatus.OnReview)]
    [InlineData(WorkOrderStatus.Accepted)]
    [InlineData(WorkOrderStatus.Closed)]
    public void Rework_is_rejected_from_every_state_except_rejected(WorkOrderStatus reachedVia)
    {
        var order = DriveTo(reachedVia);
        var statusBefore = order.Status;

        var result = order.Rework();

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_INVALID_TRANSITION");
        order.Status.Should().Be(statusBefore);
    }

    [Theory]
    [InlineData(WorkOrderStatus.New)]
    [InlineData(WorkOrderStatus.Assigned)]
    [InlineData(WorkOrderStatus.InProgress)]
    [InlineData(WorkOrderStatus.OnReview)]
    [InlineData(WorkOrderStatus.Rejected)]
    [InlineData(WorkOrderStatus.Closed)]
    public void Close_is_rejected_from_every_state_except_accepted(WorkOrderStatus reachedVia)
    {
        var order = DriveTo(reachedVia);
        var statusBefore = order.Status;

        var result = order.Close();

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("WORK_ORDER_INVALID_TRANSITION");
        order.Status.Should().Be(statusBefore);
    }

    // Drives a fresh WorkOrder to the requested status via the real state
    // machine (not by faking the field) — every "forbidden from X" test
    // exercises a WorkOrder that actually reached X through legitimate
    // transitions.
    private static WorkOrder DriveTo(WorkOrderStatus status)
    {
        var order = NewOrder();
        if (status == WorkOrderStatus.New)
            return order;

        order.Assign(DateOnly.FromDateTime(DateTime.UtcNow));
        if (status == WorkOrderStatus.Assigned)
            return order;

        order.Start();
        if (status == WorkOrderStatus.InProgress)
            return order;

        order.SubmitForReview(hasProgress: true, payoutShareComplete: true);
        if (status == WorkOrderStatus.OnReview)
            return order;

        if (status == WorkOrderStatus.Rejected)
        {
            order.Reject();
            return order;
        }

        order.Accept(DateOnly.FromDateTime(DateTime.UtcNow));
        if (status == WorkOrderStatus.Accepted)
            return order;

        order.Close();
        return order;
    }
}

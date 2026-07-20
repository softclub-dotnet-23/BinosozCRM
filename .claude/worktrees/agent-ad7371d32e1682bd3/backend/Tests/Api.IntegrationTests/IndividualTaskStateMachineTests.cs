using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §7.2 — the full IndividualTask state machine, exercised directly
// against the entity (no DB, no handler). Assigned -> InProgress -> Done,
// no going back ("не сделано как надо — бригадир заводит новую задачу").
// ProposeBonus/ApproveBonus have no API handler yet (§8.5's premium flow is
// a later, deferred bot step) but the guards exist on the entity now, so
// they're covered here too.
public sealed class IndividualTaskStateMachineTests
{
    private static IndividualTask NewTask(DateTimeOffset? dueAt = null) => IndividualTask.Create(
        Guid.NewGuid(), "BR-1", Guid.NewGuid(), Guid.NewGuid(), "Title", Guid.NewGuid(), dueAt: dueAt);

    [Fact]
    public void Happy_path_assigned_to_done()
    {
        var task = NewTask();
        task.Status.Should().Be(IndividualTaskStatus.Assigned);

        var startedAt = DateTimeOffset.UtcNow;
        task.Start(startedAt).IsSuccess.Should().BeTrue();
        task.Status.Should().Be(IndividualTaskStatus.InProgress);
        task.StartedAt.Should().Be(startedAt);

        var completedAt = startedAt.AddHours(2);
        task.Complete(completedAt).IsSuccess.Should().BeTrue();
        task.Status.Should().Be(IndividualTaskStatus.Done);
        task.CompletedAt.Should().Be(completedAt);
    }

    [Fact]
    public void CompletedEarly_is_true_when_completed_before_due_and_computed_at_close()
    {
        var dueAt = DateTimeOffset.UtcNow.AddDays(1);
        var task = NewTask(dueAt);
        task.Start(DateTimeOffset.UtcNow);

        task.Complete(dueAt.AddHours(-1));

        task.CompletedEarly.Should().BeTrue();
    }

    [Fact]
    public void CompletedEarly_is_false_when_completed_after_due()
    {
        var dueAt = DateTimeOffset.UtcNow.AddDays(1);
        var task = NewTask(dueAt);
        task.Start(DateTimeOffset.UtcNow);

        task.Complete(dueAt.AddHours(1));

        task.CompletedEarly.Should().BeFalse();
    }

    [Fact]
    public void CompletedEarly_is_false_when_no_due_date_was_set()
    {
        // DueAt is not null && ... — with no DueAt at all there's nothing to
        // beat, so this is false, not null (the property is nullable to
        // represent "not yet computed" pre-Done, not "unknown").
        var task = NewTask(dueAt: null);
        task.Start(DateTimeOffset.UtcNow);

        task.Complete(DateTimeOffset.UtcNow);

        task.CompletedEarly.Should().BeFalse();
    }

    [Theory]
    [InlineData(IndividualTaskStatus.InProgress)]
    [InlineData(IndividualTaskStatus.Done)]
    public void Start_is_rejected_from_every_state_except_assigned(IndividualTaskStatus reachedVia)
    {
        var task = DriveTo(reachedVia);
        var statusBefore = task.Status;

        var result = task.Start(DateTimeOffset.UtcNow);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("INDIVIDUAL_TASK_INVALID_TRANSITION");
        task.Status.Should().Be(statusBefore);
    }

    [Theory]
    [InlineData(IndividualTaskStatus.Assigned)]
    [InlineData(IndividualTaskStatus.Done)]
    public void Complete_is_rejected_from_every_state_except_in_progress(IndividualTaskStatus reachedVia)
    {
        var task = DriveTo(reachedVia);
        var statusBefore = task.Status;

        var result = task.Complete(DateTimeOffset.UtcNow);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("INDIVIDUAL_TASK_INVALID_TRANSITION");
        task.Status.Should().Be(statusBefore);
    }

    [Fact]
    public void No_going_back_from_done_to_in_progress_via_start()
    {
        var task = DriveTo(IndividualTaskStatus.Done);

        var result = task.Start(DateTimeOffset.UtcNow);

        result.IsFailure.Should().BeTrue();
        task.Status.Should().Be(IndividualTaskStatus.Done);
    }

    [Theory]
    [InlineData(IndividualTaskStatus.Assigned)]
    [InlineData(IndividualTaskStatus.InProgress)]
    public void ProposeBonus_is_rejected_before_done(IndividualTaskStatus reachedVia)
    {
        var task = DriveTo(reachedVia);

        var result = task.ProposeBonus(500m);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("INDIVIDUAL_TASK_INVALID_TRANSITION");
    }

    [Fact]
    public void ApproveBonus_is_rejected_when_no_bonus_was_proposed()
    {
        var task = DriveTo(IndividualTaskStatus.Done);

        var result = task.ApproveBonus(Guid.NewGuid());

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("INDIVIDUAL_TASK_INVALID_TRANSITION");
    }

    [Fact]
    public void ProposeBonus_then_ApproveBonus_succeeds_once_done()
    {
        var task = DriveTo(IndividualTaskStatus.Done);

        task.ProposeBonus(500m).IsSuccess.Should().BeTrue();
        task.BonusAmount.Should().Be(500m);

        var approverId = Guid.NewGuid();
        task.ApproveBonus(approverId).IsSuccess.Should().BeTrue();
        task.BonusApprovedByUserId.Should().Be(approverId);
    }

    private static IndividualTask DriveTo(IndividualTaskStatus status)
    {
        var task = NewTask();
        if (status == IndividualTaskStatus.Assigned)
            return task;

        task.Start(DateTimeOffset.UtcNow);
        if (status == IndividualTaskStatus.InProgress)
            return task;

        task.Complete(DateTimeOffset.UtcNow);
        return task;
    }
}

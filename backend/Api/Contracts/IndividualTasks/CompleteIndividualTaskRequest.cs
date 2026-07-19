namespace Api.Contracts.IndividualTasks;

public sealed record CompleteIndividualTaskRequest(decimal? BonusAmount);

public sealed record ApproveBonusRequest(decimal? OverrideAmount);

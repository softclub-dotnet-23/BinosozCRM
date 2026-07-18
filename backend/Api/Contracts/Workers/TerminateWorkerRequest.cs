namespace Api.Contracts.Workers;

public sealed record TerminateWorkerRequest(DateOnly TerminationDate);

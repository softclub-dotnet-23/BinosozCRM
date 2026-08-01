using Domain.Enums;

namespace Api.Contracts.Workers;

public sealed record ChangeWorkerPayRateRequest(PayRateType PayRateType, decimal PayRate, DateOnly EffectiveFrom);

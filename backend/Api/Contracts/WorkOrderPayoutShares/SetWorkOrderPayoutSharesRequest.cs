namespace Api.Contracts.WorkOrderPayoutShares;

public sealed record WorkOrderPayoutShareItemRequest(Guid WorkerId, decimal SharePercent);

public sealed record SetWorkOrderPayoutSharesRequest(IReadOnlyList<WorkOrderPayoutShareItemRequest> Shares);

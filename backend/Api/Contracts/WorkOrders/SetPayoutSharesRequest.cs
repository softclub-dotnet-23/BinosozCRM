namespace Api.Contracts.WorkOrders;

public sealed record PayoutShareInputRequest(Guid WorkerId, decimal SharePercent);

public sealed record SetPayoutSharesRequest(List<PayoutShareInputRequest> Shares);

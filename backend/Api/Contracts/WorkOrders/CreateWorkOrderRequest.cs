namespace Api.Contracts.WorkOrders;

public sealed record CreateWorkOrderRequest(
    Guid ObjectId,
    Guid BrigadeId,
    string Title,
    string Unit,
    decimal PlannedQty,
    decimal UnitPrice,
    Guid? EstimateItemId,
    DateOnly? DueDate);

public sealed record AssignWorkOrderRequest(DateOnly? AssignedDate);

public sealed record AcceptWorkOrderRequest(DateOnly? CompletedDate);

public sealed record RejectWorkOrderRequest(string Reason);

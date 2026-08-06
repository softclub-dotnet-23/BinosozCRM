using Domain.Entities;
using Domain.Enums;

namespace Application.WorkOrders;

public sealed record WorkOrderDto(
    Guid Id,
    string Code,
    Guid ObjectId,
    Guid BrigadeId,
    Guid? EstimateItemId,
    string Title,
    string Unit,
    decimal PlannedQty,
    decimal UnitPrice,
    WorkOrderStatus Status,
    DateOnly? AssignedDate,
    DateOnly? DueDate,
    DateOnly? CompletedDate,
    Guid CreatedByUserId)
{
    public static WorkOrderDto FromEntity(WorkOrder workOrder) => new(
        workOrder.Id,
        workOrder.Code,
        workOrder.ObjectId,
        workOrder.BrigadeId,
        workOrder.EstimateItemId,
        workOrder.Title,
        workOrder.Unit,
        workOrder.PlannedQty,
        workOrder.UnitPrice,
        workOrder.Status,
        workOrder.AssignedDate,
        workOrder.DueDate,
        workOrder.CompletedDate,
        workOrder.CreatedByUserId);
}

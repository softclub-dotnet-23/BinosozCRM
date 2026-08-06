namespace Application.Dashboard;

public sealed record StatusCountDto(string Status, int Count);

public sealed record DashboardWorkStatusDto(
    IReadOnlyList<StatusCountDto> WorkOrderStatusCounts,
    IReadOnlyList<StatusCountDto> IndividualTaskStatusCounts,
    int OverdueWorkOrderCount,
    int OverdueIndividualTaskCount);

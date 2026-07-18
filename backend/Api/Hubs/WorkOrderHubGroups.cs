namespace Api.Hubs;

// Shared between WorkOrdersHub (who joins which group) and
// SignalRRealtimeNotifier (who a notification is sent to) so the two never
// drift out of sync on naming.
internal static class WorkOrderHubGroups
{
    public static string Company(Guid companyId) => $"company:{companyId}";
    public static string Brigade(Guid brigadeId) => $"brigade:{brigadeId}";
}

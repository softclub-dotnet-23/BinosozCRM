import { AlertCircle, Radio } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useDashboardWorkStatus } from "../../hooks/api/useDashboard";
import { normalizeApiError } from "../../services/apiError";

/**
 * GET /api/v1/dashboard/work-status. Only Owner/Prorab get this card, matching the endpoint's
 * [Authorize(Roles = "Owner,Prorab")] — the query itself doesn't fire for other roles.
 */
export function WorkStatusFromBackendCard() {
  const { user } = useAuth();
  const allowed = user?.role === "owner" || user?.role === "prorab";
  const { data, isLoading, isError, error } = useDashboardWorkStatus();

  // Only Owner/Prorab see this card, matching the endpoint's [Authorize(Roles = "Owner,Prorab")].
  if (!allowed) return null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Radio size={16} className="text-primary" />
        <h2 className="text-lg font-bold text-ink">Статус работ</h2>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-ink-secondary">Загрузка...</p>
      ) : isError ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-red">
          <AlertCircle size={14} /> {normalizeApiError(error).message}
        </div>
      ) : data ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-ink-secondary">Work Orders по статусу</p>
            <ul className="mt-2 space-y-1.5">
              {data.workOrderStatusCounts.length === 0 ? (
                <li className="text-sm text-ink-muted">Нет данных</li>
              ) : (
                data.workOrderStatusCounts.map((s) => (
                  <li key={s.status} className="flex items-center justify-between text-sm">
                    <span className="text-ink-secondary">{s.status}</span>
                    <span className="font-semibold text-ink tabular">{s.count}</span>
                  </li>
                ))
              )}
            </ul>
            {data.overdueWorkOrderCount > 0 && (
              <Badge tone="red" className="mt-2">
                Просрочено: {data.overdueWorkOrderCount}
              </Badge>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-ink-secondary">Индивидуальные задачи по статусу</p>
            <ul className="mt-2 space-y-1.5">
              {data.individualTaskStatusCounts.length === 0 ? (
                <li className="text-sm text-ink-muted">Нет данных</li>
              ) : (
                data.individualTaskStatusCounts.map((s) => (
                  <li key={s.status} className="flex items-center justify-between text-sm">
                    <span className="text-ink-secondary">{s.status}</span>
                    <span className="font-semibold text-ink tabular">{s.count}</span>
                  </li>
                ))
              )}
            </ul>
            {data.overdueIndividualTaskCount > 0 && (
              <Badge tone="red" className="mt-2">
                Просрочено: {data.overdueIndividualTaskCount}
              </Badge>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

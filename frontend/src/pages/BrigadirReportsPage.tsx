import { useMemo } from "react";
import { Download, ClipboardList, HardHat, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { MetricCard } from "../components/ui/MetricCard";
import { useMyBrigadeWorkers } from "../hooks/api/useWorkers";
import { useMyWorkOrders } from "../hooks/api/useWorkOrders";
import { useIndividualTasks } from "../hooks/api/useIndividualTasks";
import { WorkOrderStatus, IndividualTaskStatus } from "../services/types";

const WORK_ORDER_STATUS_LABEL: Record<number, string> = {
  [WorkOrderStatus.New]: "Новый",
  [WorkOrderStatus.Assigned]: "Назначен",
  [WorkOrderStatus.InProgress]: "В работе",
  [WorkOrderStatus.OnReview]: "На проверке",
  [WorkOrderStatus.Accepted]: "Принят",
  [WorkOrderStatus.Rejected]: "Отклонён",
  [WorkOrderStatus.Closed]: "Закрыт",
};

const TASK_STATUS_LABEL: Record<number, string> = {
  [IndividualTaskStatus.Assigned]: "Назначена",
  [IndividualTaskStatus.InProgress]: "В работе",
  [IndividualTaskStatus.Done]: "Выполнена",
};

/** Real, brigade-scoped report — composed from the same endpoints WorkOrdersPage/
 * IndividualTasksPage/BrigadirTeamPage already use for their primary purpose. No backend
 * concept exists for materials/finance/attendance-dynamics reporting at the Brigadir level
 * (MaterialRequestsController's GET is Owner/Prorab only), so those tabs from the previous
 * mock version are gone rather than faked. */
export default function BrigadirReportsPage() {
  const { data: crewData } = useMyBrigadeWorkers({ page: 1, pageSize: 200 });
  const { data: workOrdersData } = useMyWorkOrders({ page: 1, pageSize: 200 });
  const { data: tasksData } = useIndividualTasks({ page: 1, pageSize: 200 });

  const crew = crewData?.items ?? [];
  const workOrders = workOrdersData?.items ?? [];
  const tasks = tasksData?.items ?? [];

  const workOrderBuckets = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of workOrders) map.set(w.status, (map.get(w.status) ?? 0) + 1);
    return map;
  }, [workOrders]);

  const taskBuckets = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of tasks) map.set(t.status, (map.get(t.status) ?? 0) + 1);
    return map;
  }, [tasks]);

  const closedWorkOrders = workOrders.filter((w) => w.status === WorkOrderStatus.Closed).length;
  const doneTasks = tasks.filter((t) => t.status === IndividualTaskStatus.Done).length;

  function exportCsv() {
    const header = ["Тип", "Название/ID", "Статус"];
    const rows: (string | number)[][] = [
      ...workOrders.map((w) => ["Наряд", w.code, WORK_ORDER_STATUS_LABEL[w.status]]),
      ...tasks.map((t) => ["Задача", t.id.slice(0, 8), TASK_STATUS_LABEL[t.status]]),
    ];
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "brigade-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout
      title="Отчёты бригады"
      subtitle="Наряды, задачи и состав бригады"
      action={<Button variant="secondary" onClick={exportCsv}><Download size={15} /> Экспорт CSV</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Сотрудников" value={String(crew.length)} icon={HardHat} tone="blue" />
        <MetricCard label="Нарядов всего" value={String(workOrders.length)} icon={ClipboardList} tone="orange" />
        <MetricCard label="Нарядов закрыто" value={String(closedWorkOrders)} icon={CheckCircle2} tone="green" />
        <MetricCard label="Задач выполнено" value={`${doneTasks} из ${tasks.length}`} icon={AlertTriangle} tone="purple" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">Наряды по статусам</h2>
          {workOrders.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Нет нарядов</p>
          ) : (
            <div className="mt-4 space-y-2">
              {Object.entries(WORK_ORDER_STATUS_LABEL).map(([value, label]) => {
                const count = workOrderBuckets.get(Number(value)) ?? 0;
                if (count === 0) return null;
                return (
                  <div key={value} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 text-ink-secondary">{label}</span>
                    <div className="h-2 flex-1 rounded-full bg-surface-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(count / workOrders.length) * 100}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right tabular font-semibold text-ink">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">Задачи по статусам</h2>
          {tasks.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Нет задач</p>
          ) : (
            <div className="mt-4 space-y-2">
              {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => {
                const count = taskBuckets.get(Number(value)) ?? 0;
                if (count === 0) return null;
                return (
                  <div key={value} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 text-ink-secondary">{label}</span>
                    <div className="h-2 flex-1 rounded-full bg-surface-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(count / tasks.length) * 100}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right tabular font-semibold text-ink">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

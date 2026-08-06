import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { useMyBrigadeWorkers } from "../hooks/api/useWorkers";
import { useMyWorkOrders } from "../hooks/api/useWorkOrders";
import { useIndividualTasks } from "../hooks/api/useIndividualTasks";
import { WorkOrderStatus, IndividualTaskStatus } from "../services/types";
import {
  UsersIcon,
  ClipboardIcon,
  CheckIcon,
  BuildingIcon,
  ClockIcon,
  AlertIcon,
  Card,
  CardHeader,
  Badge,
  KpiCard,
} from "../components/brigadir/shared";

const WORK_ORDER_STATUS_LABEL: Record<number, string> = {
  [WorkOrderStatus.New]: "Новый",
  [WorkOrderStatus.Assigned]: "Назначен",
  [WorkOrderStatus.InProgress]: "В работе",
  [WorkOrderStatus.OnReview]: "На проверке",
  [WorkOrderStatus.Accepted]: "Принят",
  [WorkOrderStatus.Rejected]: "Отклонён",
  [WorkOrderStatus.Closed]: "Закрыт",
};

const WORK_ORDER_STATUS_COLOR: Record<number, string> = {
  [WorkOrderStatus.New]: "purple",
  [WorkOrderStatus.Assigned]: "blue",
  [WorkOrderStatus.InProgress]: "orange",
  [WorkOrderStatus.OnReview]: "blue",
  [WorkOrderStatus.Accepted]: "green",
  [WorkOrderStatus.Rejected]: "red",
  [WorkOrderStatus.Closed]: "green",
};

export default function BrigadirDashboardPage() {
  const navigate = useNavigate();
  const { data: crewData } = useMyBrigadeWorkers({ page: 1, pageSize: 200 });
  const { data: workOrdersData } = useMyWorkOrders({ page: 1, pageSize: 50 });
  const { data: tasksData } = useIndividualTasks({ page: 1, pageSize: 50 });

  const crew = crewData?.items ?? [];
  const workOrders = workOrdersData?.items ?? [];
  const tasks = tasksData?.items ?? [];

  const kpis = useMemo(() => {
    const inProgress = workOrders.filter((w) => w.status === WorkOrderStatus.InProgress).length;
    const onReview = workOrders.filter((w) => w.status === WorkOrderStatus.OnReview).length;
    const openTasks = tasks.filter((t) => t.status !== IndividualTaskStatus.Done).length;
    return { crewSize: crew.length, inProgress, onReview, openTasks };
  }, [crew, workOrders, tasks]);

  const activeOrders = workOrders.filter((w) => w.status !== WorkOrderStatus.Closed).slice(0, 5);

  return (
    <AppLayout title="Панель бригадира" subtitle="Бригада, наряды и задачи" titleBelowHeader contentMaxWidth="1280px">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Состав бригады" value={String(kpis.crewSize)} note="человек" color="blue" icon={UsersIcon} />
        <KpiCard label="Наряды в работе" value={String(kpis.inProgress)} note="" color="orange" icon={ClipboardIcon} />
        <KpiCard label="На проверке" value={String(kpis.onReview)} note="" color="blue" icon={CheckIcon} />
        <KpiCard label="Открытых задач" value={String(kpis.openTasks)} note="" color="orange" icon={AlertIcon} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>Наряды бригады</CardHeader>
          {activeOrders.length === 0 ? (
            <p className="p-4 text-[11px] text-ink-muted">Нет активных нарядов</p>
          ) : (
            <div className="divide-y divide-border px-4">
              {activeOrders.map((w) => (
                <div key={w.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <ClockIcon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold">{w.title}</p>
                    <p className="text-[9px] text-ink-muted">{w.code}</p>
                  </div>
                  <Badge color={WORK_ORDER_STATUS_COLOR[w.status]}>{WORK_ORDER_STATUS_LABEL[w.status]}</Badge>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate("/work-orders")} className="flex w-full items-center justify-between border-t border-border px-5 py-3 text-[11px] font-bold text-primary hover:bg-primary-soft">
            <span>Все наряды</span><span>→</span>
          </button>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>Моя бригада</CardHeader>
          {crew.length === 0 ? (
            <p className="p-4 text-[11px] text-ink-muted">Нет данных о бригаде</p>
          ) : (
            <div className="divide-y divide-border px-4">
              {crew.slice(0, 5).map((w) => (
                <div key={w.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <BuildingIcon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold">{w.fullName}</p>
                    <p className="text-[9px] text-ink-muted">{w.specialty ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate("/brigades")} className="flex w-full items-center justify-between border-t border-border px-5 py-3 text-[11px] font-bold text-primary hover:bg-primary-soft">
            <span>Показать всех сотрудников</span><span>→</span>
          </button>
        </Card>
      </div>
    </AppLayout>
  );
}

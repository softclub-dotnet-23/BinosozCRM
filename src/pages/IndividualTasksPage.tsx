import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ClipboardList, Gift, Play, Plus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { BackendSessionRequired } from "../components/auth/BackendSessionRequired";
import { useAuth } from "../context/AuthContext";
import {
  useApproveTaskBonus,
  useCompleteIndividualTask,
  useCreateIndividualTask,
  useIndividualTasks,
  useStartIndividualTask,
} from "../hooks/api/useIndividualTasks";
import { normalizeApiError } from "../services/apiError";
import { INDIVIDUAL_TASK_STATUS_LABEL, IndividualTaskStatus } from "../services/types";
import type { IndividualTaskDto } from "../services/individualTasksApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

const STATUS_TONE: Record<IndividualTaskStatus, "blue" | "orange" | "green"> = {
  [IndividualTaskStatus.Assigned]: "blue",
  [IndividualTaskStatus.InProgress]: "orange",
  [IndividualTaskStatus.Done]: "green",
};

/**
 * Pilot module for the real backend integration (IndividualTasksController — api/v1/individual-tasks).
 * Dedicated page rather than a WorksPage retrofit: WorksPage represents WorkOrder-shaped mock data
 * (code/section/brigade/responsible), a materially different backend concept from IndividualTask
 * (a single Brigadir-assigned task with an optional completion bonus). Reusing WorksPage would mean
 * either inventing WorkOrder fields the backend doesn't return here, or silently dropping real
 * IndividualTask fields — both worse than a new page.
 */
export default function IndividualTasksPage() {
  const { user } = useAuth();
  const isBackendSession = user?.isBackendSession ?? false;
  const isBrigadir = isBackendSession && user?.role === "brigadir";
  const canApproveBonus = isBackendSession && (user?.role === "owner" || user?.role === "prorab");

  const [page, setPage] = useState(1);
  // Verified live against the running backend: GET /individual-tasks is genuinely
  // [Authorize(Roles = "Brigadir")] only — Owner/Prorab get a real 403, confirmed via a direct
  // HTTP request, not assumed. There is also no other endpoint that lists tasks with a pending
  // bonus, so Owner/Prorab cannot browse a list at all; they can only approve a bonus for a task
  // whose id they already know (e.g. from a Telegram notification — this app has a TelegramBot
  // project). The query below only fires for Brigadir; Owner/Prorab get a dedicated approve-by-id
  // form instead of a fake empty table.
  const { data, isLoading, isError, error, refetch } = useIndividualTasks({ page, pageSize: PAGE_SIZE }, isBrigadir);

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<IndividualTaskDto | null>(null);

  const createMutation = useCreateIndividualTask();
  const startMutation = useStartIndividualTask();
  const completeMutation = useCompleteIndividualTask();
  const approveMutation = useApproveTaskBonus();

  const columns: DataTableColumn<IndividualTaskDto>[] = [
    {
      key: "code",
      header: "Код",
      sticky: "left",
      width: "96px",
      render: (row) => <span className="font-semibold text-ink">{row.code}</span>,
    },
    {
      key: "title",
      header: "Название",
      render: (row) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate font-medium text-ink">{row.title}</p>
          {row.description && <p className="truncate text-xs text-ink-secondary">{row.description}</p>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{INDIVIDUAL_TASK_STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: "dueAt",
      header: "Срок",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.dueAt ? formatDateShort(row.dueAt) : "—"}</span>,
    },
    {
      key: "bonus",
      header: "Бонус",
      render: (row) =>
        row.bonusAmount ? (
          <div className="flex items-center gap-1.5">
            <span className="tabular font-semibold text-ink">{row.bonusAmount.toLocaleString("ru-RU")} с.</span>
            {row.bonusApprovedByUserId ? (
              <Badge tone="green">утверждён</Badge>
            ) : (
              <Badge tone="orange">ожидает</Badge>
            )}
          </div>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "Действия",
      sticky: "right",
      width: "220px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isBrigadir && row.status === IndividualTaskStatus.Assigned && (
            <Button
              size="sm"
              variant="outline"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate(row.id)}
            >
              <Play size={13} /> Начать
            </Button>
          )}
          {isBrigadir && row.status === IndividualTaskStatus.InProgress && (
            <Button size="sm" onClick={() => setCompleteTarget(row)}>
              <CheckCircle2 size={13} /> Завершить
            </Button>
          )}
        </div>
      ),
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout
      title="Индивидуальные задачи"
      subtitle={isBrigadir ? "Задачи, назначенные вашей бригаде" : "Задачи бригад и утверждение бонусов"}
      action={
        isBrigadir ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Новая задача
          </Button>
        ) : undefined
      }
    >
      {!isBackendSession && <BackendSessionRequired roleHint="Owner, Prorab или Brigadir" />}

      {isBrigadir && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список задач</h2>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="px-5 sm:px-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={6} />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon={AlertCircle}
                title="Не удалось загрузить задачи"
                description={normalizeApiError(error).message}
                action={
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Повторить
                  </Button>
                }
              />
            ) : rows.length > 0 ? (
              <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={ClipboardList} title="Задач пока нет" description="Создайте первую задачу для вашей бригады" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="задач"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      )}

      {canApproveBonus && <ApproveBonusByIdCard mutation={approveMutation} />}

      {isBrigadir && (
        <CreateTaskModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
          submitting={createMutation.isPending}
        />
      )}

      <CompleteTaskModal
        task={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onSubmit={(bonusAmount) =>
          completeTarget &&
          completeMutation.mutate(
            { taskId: completeTarget.id, request: bonusAmount ? { bonusAmount } : undefined },
            { onSuccess: () => setCompleteTarget(null) },
          )
        }
        submitting={completeMutation.isPending}
      />

    </AppLayout>
  );
}

function CreateTaskModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: { assignedToWorkerId: string; title: string; description?: string; dueAt?: string }) => void;
  submitting: boolean;
}) {
  const [assignedToWorkerId, setAssignedToWorkerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !assignedToWorkerId.trim() || !title.trim()) return;
    onSubmit({
      assignedToWorkerId: assignedToWorkerId.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Новая индивидуальная задача">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="task-worker-id">
            ID работника (assignedToWorkerId)
          </label>
          <input
            id="task-worker-id"
            required
            value={assignedToWorkerId}
            onChange={(e) => setAssignedToWorkerId(e.target.value)}
            placeholder="GUID работника из вашей бригады"
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <p className="mt-1 text-xs text-ink-muted">
            Бэкенд пока не предоставляет бригадиру список работников бригады (GET /brigades/{"{id}"}/workers доступен
            только Owner/Prorab) — введите ID вручную, пока список выбора не появится в API.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="task-title">
            Название
          </label>
          <input
            id="task-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="task-description">
            Описание (необязательно)
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="task-due">
            Срок (необязательно)
          </label>
          <input
            id="task-due"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Создание..." : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CompleteTaskModal({
  task,
  onClose,
  onSubmit,
  submitting,
}: {
  task: IndividualTaskDto | null;
  onClose: () => void;
  onSubmit: (bonusAmount?: number) => void;
  submitting: boolean;
}) {
  const [bonusAmount, setBonusAmount] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onSubmit(bonusAmount.trim() ? Number(bonusAmount) : undefined);
    setBonusAmount("");
  }

  return (
    <Modal open={Boolean(task)} onClose={onClose} title={`Завершить задачу${task ? `: ${task.title}` : ""}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="complete-bonus">
            Предлагаемый бонус, сомони (необязательно)
          </label>
          <input
            id="complete-bonus"
            type="number"
            min="0"
            step="0.01"
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <p className="mt-1 text-xs text-ink-muted">Требует утверждения Owner или Prorab, прежде чем будет выплачен.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Сохранение..." : "Завершить"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Owner/Prorab cannot list individual tasks at all (verified live: GET /individual-tasks
 * returns a real 403 for these roles — Brigadir-only), and there is no other endpoint that
 * lists tasks with a bonus pending approval. So instead of a fake "browse and click" table this
 * role can never actually see, they get an honest "approve by id" form — the task id has to come
 * from elsewhere (Telegram notification, or the Brigadir directly).
 */
function ApproveBonusByIdCard({ mutation }: { mutation: ReturnType<typeof useApproveTaskBonus> }) {
  const [taskId, setTaskId] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mutation.isPending || !taskId.trim()) return;
    mutation.mutate(
      { taskId: taskId.trim(), request: overrideAmount.trim() ? { overrideAmount: Number(overrideAmount) } : undefined },
      { onSuccess: () => { setTaskId(""); setOverrideAmount(""); } },
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Gift size={16} className="text-primary" />
        <h2 className="text-lg font-bold text-ink">Утвердить бонус по ID задачи</h2>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Backend не предоставляет вашей роли список задач с ожидающим бонусом (GET /individual-tasks доступен только
        Brigadir) — введите ID задачи, полученный от бригадира или из уведомления.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-sm font-medium text-ink" htmlFor="approve-task-id">
            ID задачи
          </label>
          <input
            id="approve-task-id"
            required
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="GUID задачи"
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="w-40">
          <label className="text-sm font-medium text-ink" htmlFor="approve-override">
            Новая сумма (необязательно)
          </label>
          <input
            id="approve-override"
            type="number"
            min="0"
            step="0.01"
            value={overrideAmount}
            onChange={(e) => setOverrideAmount(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Утверждение..." : "Утвердить"}
        </Button>
      </form>
    </Card>
  );
}

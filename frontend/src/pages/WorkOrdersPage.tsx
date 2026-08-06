import { useState, type ChangeEvent, type FormEvent } from "react";
import { AlertCircle, Camera, ClipboardCheck, PlayCircle, RotateCcw, Send } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import {
  useAddWorkOrderProgress,
  useMyWorkOrders,
  useReworkWorkOrder,
  useStartWorkOrder,
  useSubmitWorkOrder,
} from "../hooks/api/useWorkOrders";
import { normalizeApiError } from "../services/apiError";
import { resolveSignedFileUrl } from "../services/filesApi";
import { WorkOrderStatus } from "../services/types";
import type { WorkOrderDto } from "../services/workOrdersApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.New]: "Новый",
  [WorkOrderStatus.Assigned]: "Назначен",
  [WorkOrderStatus.InProgress]: "В работе",
  [WorkOrderStatus.OnReview]: "На проверке",
  [WorkOrderStatus.Accepted]: "Принят",
  [WorkOrderStatus.Rejected]: "Отклонён",
  [WorkOrderStatus.Closed]: "Закрыт",
};

const STATUS_TONE: Record<WorkOrderStatus, "purple" | "blue" | "orange" | "green" | "red"> = {
  [WorkOrderStatus.New]: "purple",
  [WorkOrderStatus.Assigned]: "blue",
  [WorkOrderStatus.InProgress]: "orange",
  [WorkOrderStatus.OnReview]: "blue",
  [WorkOrderStatus.Accepted]: "green",
  [WorkOrderStatus.Rejected]: "red",
  [WorkOrderStatus.Closed]: "green",
};

/**
 * Dedicated page for the Brigadir-reachable slice of WorkOrdersController (api/v1/work-orders):
 * GET /work-orders/mine, /start, /submit, /rework, and the multipart /progress upload. The
 * Owner/Prorab side (list all, assign/accept/reject/close) isn't wired here — it wasn't part of
 * the requested module and has no matching existing frontend page either. No existing page
 * modeled WorkOrders at all (WorksPage.tsx maps to a different concept), so this is new.
 */
export default function WorkOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useMyWorkOrders({ page, pageSize: PAGE_SIZE });

  const [progressTarget, setProgressTarget] = useState<WorkOrderDto | null>(null);

  const startMutation = useStartWorkOrder();
  const submitMutation = useSubmitWorkOrder();
  const reworkMutation = useReworkWorkOrder();
  const progressMutation = useAddWorkOrderProgress();

  const columns: DataTableColumn<WorkOrderDto>[] = [
    {
      key: "title",
      header: "Наряд",
      sticky: "left",
      width: "220px",
      render: (row) => (
        <div>
          <p className="truncate font-semibold text-ink">{row.title}</p>
          <p className="text-xs text-ink-muted">{row.code}</p>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Объём",
      render: (row) => (
        <span className="tabular text-ink-secondary">
          {row.plannedQty} {row.unit}
        </span>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: "dueDate",
      header: "Срок",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.dueDate ? formatDateShort(row.dueDate) : "—"}</span>,
    },
    {
      key: "actions",
      header: "Действия",
      sticky: "right",
      width: "300px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === WorkOrderStatus.Assigned && (
            <Button size="sm" disabled={startMutation.isPending} onClick={() => startMutation.mutate(row.id)}>
              <PlayCircle size={13} /> Начать
            </Button>
          )}
          {row.status === WorkOrderStatus.InProgress && (
            <>
              <Button size="sm" variant="outline" onClick={() => setProgressTarget(row)}>
                <Camera size={13} /> Прогресс
              </Button>
              <Button size="sm" disabled={submitMutation.isPending} onClick={() => submitMutation.mutate(row.id)}>
                <Send size={13} /> На проверку
              </Button>
            </>
          )}
          {row.status === WorkOrderStatus.Rejected && (
            <Button size="sm" disabled={reworkMutation.isPending} onClick={() => reworkMutation.mutate(row.id)}>
              <RotateCcw size={13} /> Возобновить
            </Button>
          )}
        </div>
      ),
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout title="Мои наряды" subtitle="Наряды вашей бригады">
      {(
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список нарядов</h2>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="px-5 sm:px-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={5} />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon={AlertCircle}
                title="Не удалось загрузить наряды"
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
              <EmptyState icon={ClipboardCheck} title="Нарядов пока нет" description="Наряды появятся здесь после назначения прорабом" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="нарядов"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      )}

      {(
        <Modal open={Boolean(progressTarget)} onClose={() => setProgressTarget(null)} title="Отчёт о прогрессе">
          <ProgressForm
            onSubmit={(request) =>
              progressTarget &&
              progressMutation.mutate({ workOrderId: progressTarget.id, request }, { onSuccess: () => setProgressTarget(null) })
            }
            onCancel={() => setProgressTarget(null)}
            submitting={progressMutation.isPending}
            lastResult={progressMutation.isSuccess ? progressMutation.data : undefined}
          />
        </Modal>
      )}
    </AppLayout>
  );
}

function ProgressForm({
  onSubmit,
  onCancel,
  submitting,
  lastResult,
}: {
  onSubmit: (request: { reportedQty: number; comment?: string; photos?: File[] }) => void;
  onCancel: () => void;
  submitting: boolean;
  lastResult?: { photoUrls: string[] };
}) {
  const [reportedQty, setReportedQty] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const invalidType = files.find((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type));
    if (invalidType) {
      setFileError("Допустимы только JPEG, PNG или WebP");
      setPhotos([]);
      return;
    }
    const tooLarge = files.find((f) => f.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setFileError("Каждый файл не должен превышать 5 МБ");
      setPhotos([]);
      return;
    }
    setFileError("");
    setPhotos(files);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !reportedQty.trim()) return;
    onSubmit({ reportedQty: Number(reportedQty), comment: comment.trim() || undefined, photos });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="wo-qty">
          Выполненный объём
        </label>
        <input id="wo-qty" type="number" min="0" step="0.01" required value={reportedQty} onChange={(e) => setReportedQty(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="wo-comment">
          Комментарий (необязательно)
        </label>
        <textarea id="wo-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="wo-photos">
          Фото (необязательно)
        </label>
        <input
          id="wo-photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFilesChange}
          className="mt-1.5 block w-full text-sm text-ink-secondary file:mr-3 file:rounded-[10px] file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
        />
        {fileError && <p className="mt-1 text-xs text-red">{fileError}</p>}
        {photos.length > 0 && <p className="mt-1 text-xs text-ink-muted">{photos.length} файл(ов) выбрано</p>}
      </div>
      {lastResult && lastResult.photoUrls.length > 0 && (
        <div className="rounded-[10px] border border-border-strong bg-surface-1 p-3">
          <p className="mb-1.5 text-xs font-semibold text-ink">Загруженные фото последнего отчёта:</p>
          <div className="flex flex-wrap gap-2">
            {lastResult.photoUrls.map((url, i) => (
              <a key={i} href={resolveSignedFileUrl(url)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:text-primary-hover">
                Фото {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={submitting || Boolean(fileError)}>
          {submitting ? "Отправка..." : "Отправить отчёт"}
        </Button>
      </div>
    </form>
  );
}

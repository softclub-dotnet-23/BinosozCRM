import { useState, type ChangeEvent, type FormEvent } from "react";
import { AlertCircle, CalendarOff, ExternalLink, Plus } from "lucide-react";
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
import { useAbsences, useCreateAbsence } from "../hooks/api/useAbsences";
import { normalizeApiError } from "../services/apiError";
import { resolveSignedFileUrl } from "../services/filesApi";
import { ABSENCE_TYPE_LABEL, AbsenceType } from "../services/types";
import type { AbsenceRecordDto } from "../services/absencesApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

/**
 * Dedicated page for AbsencesController (api/v1/absences) — Owner/Prorab/Accountant only, no
 * Brigadir path at all (confirmed: zero Brigadir-reachable actions on this controller). POST is
 * multipart/form-data (Api/Contracts/Absences/CreateAbsenceRecordRequest.cs's IFormFile property
 * is "Document").
 */
export default function AbsencesPage() {
  const { user } = useAuth();
  const isBackendSession = user?.isBackendSession ?? false;

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useAbsences({ page, pageSize: PAGE_SIZE }, isBackendSession);
  const [createOpen, setCreateOpen] = useState(false);
  const createMutation = useCreateAbsence();

  const columns: DataTableColumn<AbsenceRecordDto>[] = [
    {
      key: "period",
      header: "Период",
      sticky: "left",
      width: "180px",
      render: (row) => (
        <span className="whitespace-nowrap font-medium text-ink">
          {formatDateShort(row.dateFrom)} – {formatDateShort(row.dateTo)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Тип",
      render: (row) => <Badge tone="blue">{ABSENCE_TYPE_LABEL[row.type]}</Badge>,
    },
    {
      key: "paid",
      header: "Оплачивается",
      render: (row) => (row.isPaid ? <Badge tone="green">да</Badge> : <Badge tone="purple">нет</Badge>),
    },
    {
      key: "reason",
      header: "Причина",
      render: (row) => <span className="text-ink-secondary">{row.reason || "—"}</span>,
    },
    {
      key: "document",
      header: "Документ",
      render: (row) =>
        row.documentUrl ? (
          <a
            href={resolveSignedFileUrl(row.documentUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover"
            onClick={(e) => e.stopPropagation()}
          >
            Открыть <ExternalLink size={13} />
          </a>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: "approved",
      header: "Утверждено",
      render: (row) => (row.approvedByUserId ? <Badge tone="green">да</Badge> : <Badge tone="orange">нет</Badge>),
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout
      title="Отсутствия"
      subtitle="Больничные, отпуска и другие отсутствия"
      action={
        isBackendSession ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Новое отсутствие
          </Button>
        ) : undefined
      }
    >
      {!isBackendSession ? (
        <BackendSessionRequired roleHint="Owner, Prorab или Accountant" />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список отсутствий</h2>
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
                title="Не удалось загрузить отсутствия"
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
              <EmptyState icon={CalendarOff} title="Отсутствий пока нет" description="Зарегистрируйте первое отсутствие" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="записей"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      )}

      {isBackendSession && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новое отсутствие">
          <AbsenceForm
            onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
            onCancel={() => setCreateOpen(false)}
            submitting={createMutation.isPending}
          />
        </Modal>
      )}
    </AppLayout>
  );
}

function AbsenceForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (request: { workerId: string; dateFrom: string; dateTo: string; type: AbsenceType; isPaid: boolean; reason?: string; document?: File | null }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [workerId, setWorkerId] = useState("");
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<AbsenceType>(AbsenceType.SickLeave);
  const [isPaid, setIsPaid] = useState(false);
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError("Допустимы только JPEG, PNG или WebP");
      setDocument(null);
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setFileError("Файл не должен превышать 5 МБ");
      setDocument(null);
      return;
    }
    setFileError("");
    setDocument(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !workerId.trim()) return;
    onSubmit({
      workerId: workerId.trim(),
      dateFrom,
      dateTo,
      type,
      isPaid,
      reason: reason.trim() || undefined,
      document,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="ab-worker-id">
          ID работника
        </label>
        <input id="ab-worker-id" required value={workerId} onChange={(e) => setWorkerId(e.target.value)} placeholder="GUID работника" className={fieldClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="ab-date-from">
            С даты
          </label>
          <input id="ab-date-from" type="date" required value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="ab-date-to">
            По дату
          </label>
          <input id="ab-date-to" type="date" required value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="ab-type">
          Тип отсутствия
        </label>
        <select id="ab-type" value={type} onChange={(e) => setType(Number(e.target.value) as AbsenceType)} className={fieldClass}>
          {Object.entries(ABSENCE_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="h-4 w-4 rounded border-border-strong accent-primary" />
        Оплачивается
      </label>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="ab-reason">
          Причина (необязательно)
        </label>
        <textarea id="ab-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="ab-document">
          Подтверждающий документ (необязательно)
        </label>
        <input id="ab-document" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="mt-1.5 block w-full text-sm text-ink-secondary file:mr-3 file:rounded-[10px] file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary" />
        {fileError && <p className="mt-1 text-xs text-red">{fileError}</p>}
        {document && <p className="mt-1 text-xs text-ink-muted">{document.name}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={submitting || Boolean(fileError)}>
          {submitting ? "Загрузка..." : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}

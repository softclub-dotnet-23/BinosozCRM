import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Briefcase, Download, Eye, HardHat, MoreVertical, Plus, UserX } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { Avatar } from "../components/ui/Avatar";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { CustomSelect } from "../components/ui/CustomSelect";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useBrigades } from "../hooks/api/useBrigades";
import { useCreateWorker, useTerminateWorker, useWorkers } from "../hooks/api/useWorkers";
import { useToast } from "../hooks/useToast";
import { normalizeApiError } from "../services/apiError";
import { PAY_RATE_TYPE_LABEL, PayRateType } from "../services/types";
import type { WorkerDto } from "../services/workersApi";
import { formatCurrency } from "../utils/format";

const PAGE_SIZE = 20;

export default function EmployeesPage() {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [brigadeFilter, setBrigadeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<WorkerDto | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<WorkerDto | null>(null);

  const { data: brigadesData } = useBrigades({ page: 1, pageSize: 200 });
  const brigades = brigadesData?.items ?? [];
  const brigadeName = (brigadeId: string) => brigades.find((b) => b.id === brigadeId)?.name ?? "—";

  const { data, isLoading, isError, error, refetch } = useWorkers({
    page,
    pageSize: PAGE_SIZE,
    includeInactive: statusFilter !== "active",
    brigadeId: brigadeFilter === "all" ? undefined : brigadeFilter,
  });
  const createMutation = useCreateWorker();
  const terminateMutation = useTerminateWorker();

  const rows = data?.items ?? [];
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((w) => {
      if (statusFilter === "active" && !w.isActive) return false;
      if (statusFilter === "inactive" && w.isActive) return false;
      if (query && !`${w.fullName} ${w.phone} ${w.specialty ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  const kpis = useMemo(() => {
    const active = rows.filter((w) => w.isActive).length;
    const inactive = rows.filter((w) => !w.isActive).length;
    const brigadeCount = new Set(rows.map((w) => w.brigadeId)).size;
    return { total: rows.length, active, inactive, brigadeCount };
  }, [rows]);

  function handleExport() {
    const header = ["ФИО", "Бригада", "Специальность", "Телефон", "Дата приёма", "Статус"];
    const csvRows = filteredRows.map((w) => [
      w.fullName,
      brigadeName(w.brigadeId),
      w.specialty ?? "",
      w.phone,
      w.hireDate,
      w.isActive ? "Активен" : "Уволен",
    ]);
    const csv = [header, ...csvRows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sotrudniki.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<WorkerDto>[] = [
    {
      key: "employee",
      header: "Сотрудник",
      sticky: "left",
      width: "220px",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.fullName} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.fullName}</p>
            <p className="truncate text-xs text-ink-muted">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "brigade",
      header: "Бригада",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{brigadeName(row.brigadeId)}</span>,
    },
    {
      key: "specialty",
      header: "Специальность",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.specialty ?? "—"}</span>,
    },
    {
      key: "payRate",
      header: "Ставка",
      render: (row) =>
        row.payRateType !== null && row.payRate !== null ? (
          <span className="whitespace-nowrap text-ink">
            {formatCurrency(row.payRate)} · {PAY_RATE_TYPE_LABEL[row.payRateType]}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: "hireDate",
      header: "Дата приёма",
      render: (row) => <span className="tabular whitespace-nowrap text-ink-secondary">{row.hireDate}</span>,
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => (
        <span className={`user-status ${row.isActive ? "active" : "inactive"}`}>{row.isActive ? "Активен" : "Уволен"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "48px",
      sticky: "right",
      render: (row) => (
        <div className="flex items-center justify-end">
          <DropdownMenu
            trigger={<MoreVertical size={16} />}
            items={[
              { label: "Просмотр", icon: <Eye size={14} />, onClick: () => setViewing(row) },
              {
                label: "Уволить",
                icon: <UserX size={14} />,
                onClick: () => setTerminateTarget(row),
                disabled: !row.isActive,
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Сотрудники" subtitle="Работники бригад компании">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Briefcase} label="Всего на странице" value={String(kpis.total)} tone="blue" />
        <MetricCard icon={Briefcase} label="Активны" value={String(kpis.active)} tone="green" />
        <MetricCard icon={UserX} label="Уволены" value={String(kpis.inactive)} tone="orange" />
        <MetricCard icon={HardHat} label="Бригад" value={String(kpis.brigadeCount)} tone="purple" />
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <SearchInput
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Поиск по имени, телефону, специальности"
          className="min-w-55 flex-1"
        />
        <CustomSelect
          size="sm"
          value={brigadeFilter}
          onValueChange={(v) => { setBrigadeFilter(v); setPage(1); }}
          options={[{ value: "all", label: "Все бригады" }, ...brigades.map((b) => ({ value: b.id, label: b.name }))]}
        />
        <CustomSelect
          size="sm"
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
          options={[{ value: "active", label: "Активные" }, { value: "inactive", label: "Уволенные" }, { value: "all", label: "Все" }]}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={filteredRows.length === 0}><Download size={15} /> Экспорт</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Сотрудник</Button>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-4">{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}</div>
        ) : isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Не удалось загрузить сотрудников"
            description={normalizeApiError(error).message}
            action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>}
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState icon={Briefcase} title="Сотрудников не найдено" description="Измените фильтры или добавьте нового сотрудника" />
        ) : (
          <>
            <DataTable columns={columns} rows={filteredRows} rowKey={(row) => row.id} />
            {data && (
              <Pagination
                page={page}
                pageCount={pageCount}
                pageSize={data.pageSize}
                total={data.totalCount}
                itemLabel="сотрудников"
                onPageChange={setPage}
                onPageSizeChange={() => {}}
              />
            )}
          </>
        )}
      </Card>

      <CreateWorkerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        brigades={brigades}
        submitting={createMutation.isPending}
        onSubmit={(brigadeId, request) =>
          createMutation.mutate(
            { brigadeId, request },
            { onSuccess: () => { setCreateOpen(false); showToast("Сотрудник добавлен"); } },
          )
        }
      />

      <ViewWorkerModal worker={viewing} brigadeName={viewing ? brigadeName(viewing.brigadeId) : ""} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={terminateTarget !== null}
        title="Уволить сотрудника?"
        description={terminateTarget ? `${terminateTarget.fullName} будет отмечен как уволенный с сегодняшней датой.` : undefined}
        confirmLabel="Уволить"
        danger
        onConfirm={() => {
          if (!terminateTarget) return;
          terminateMutation.mutate({ workerId: terminateTarget.id, terminationDate: new Date().toISOString().slice(0, 10) });
        }}
        onClose={() => setTerminateTarget(null)}
      />
    </AppLayout>
  );
}

function ViewWorkerModal({ worker, brigadeName, onClose }: { worker: WorkerDto | null; brigadeName: string; onClose: () => void }) {
  return (
    <Modal open={worker !== null} onClose={onClose} title="Карточка сотрудника" description={worker?.phone} size="md">
      {worker && (
        <div className="users-modal-form">
          <label><span>ФИО</span><input readOnly value={worker.fullName} /></label>
          <label><span>Бригада</span><input readOnly value={brigadeName} /></label>
          <label><span>Специальность</span><input readOnly value={worker.specialty ?? "—"} /></label>
          <label><span>Дата рождения</span><input readOnly value={worker.birthDate} /></label>
          <label><span>Дата приёма</span><input readOnly value={worker.hireDate} /></label>
          {worker.payRateType !== null && worker.payRate !== null && (
            <label><span>Ставка</span><input readOnly value={`${formatCurrency(worker.payRate)} · ${PAY_RATE_TYPE_LABEL[worker.payRateType]}`} /></label>
          )}
          <label><span>Статус</span><input readOnly value={worker.isActive ? "Активен" : "Уволен"} /></label>
          {worker.terminationDate && <label><span>Дата увольнения</span><input readOnly value={worker.terminationDate} /></label>}
          <div className="users-modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button></div>
        </div>
      )}
    </Modal>
  );
}

function CreateWorkerModal({
  open,
  onClose,
  brigades,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  brigades: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (
    brigadeId: string,
    request: {
      fullName: string;
      phone: string;
      birthDate: string;
      payRateType: PayRateType;
      payRate: number;
      hireDate: string;
      specialty?: string | null;
    },
  ) => void;
}) {
  const [brigadeId, setBrigadeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [payRateType, setPayRateType] = useState<PayRateType>(PayRateType.Hourly);
  const [payRate, setPayRate] = useState("");
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [specialty, setSpecialty] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setBrigadeId("");
    setFullName("");
    setPhone("");
    setBirthDate("");
    setPayRateType(PayRateType.Hourly);
    setPayRate("");
    setHireDate(new Date().toISOString().slice(0, 10));
    setSpecialty("");
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!brigadeId) return setError("Выберите бригаду");
    if (!fullName.trim() || !phone.trim() || !birthDate || !hireDate) return setError("Заполните обязательные поля");
    const rate = Number(payRate);
    if (!Number.isFinite(rate) || rate < 0) return setError("Некорректная ставка");

    onSubmit(brigadeId, {
      fullName: fullName.trim(),
      phone: phone.trim(),
      birthDate,
      payRateType,
      payRate: rate,
      hireDate,
      specialty: specialty.trim() || null,
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Новый сотрудник" size="md">
      <form className="users-modal-form" onSubmit={handleSubmit}>
        <label>
          <span>Бригада</span>
          <CustomSelect fullWidth value={brigadeId} onValueChange={setBrigadeId} options={brigades.map((b) => ({ value: b.id, label: b.name }))} placeholder="Выберите бригаду" />
        </label>
        <label><span>ФИО</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label><span>Телефон</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 90 456 78 90" /></label>
        <label><span>Дата рождения</span><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label>
        <label><span>Специальность</span><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></label>
        <label>
          <span>Тип ставки</span>
          <CustomSelect
            fullWidth
            value={String(payRateType)}
            onValueChange={(v) => setPayRateType(Number(v) as PayRateType)}
            options={[{ value: String(PayRateType.Hourly), label: "Почасовая" }, { value: String(PayRateType.Piecework), label: "Сдельная" }]}
          />
        </label>
        <label><span>Ставка</span><input type="number" min="0" step="0.01" value={payRate} onChange={(e) => setPayRate(e.target.value)} /></label>
        <label><span>Дата приёма</span><input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Добавление..." : "Добавить"}</Button>
        </div>
      </form>
    </Modal>
  );
}

import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Building2, CheckCircle2, Clock, Eye, Pause, Pencil, Plus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useObjects, useCreateObject, useUpdateObject, useObjectCostBreakdown } from "../hooks/api/useObjects";
import { useCustomers, useCreateCustomer } from "../hooks/api/useCustomers";
import { normalizeApiError } from "../services/apiError";
import { CONSTRUCTION_OBJECT_STATUS_LABEL, ConstructionObjectStatus } from "../services/types";
import type { ConstructionObjectDto } from "../services/objectsApi";
import { formatCurrency } from "../utils/format";

const STATUS_TONE: Record<ConstructionObjectStatus, "blue" | "green" | "orange" | "red" | "purple"> = {
  [ConstructionObjectStatus.Planned]: "blue",
  [ConstructionObjectStatus.InProgress]: "orange",
  [ConstructionObjectStatus.Suspended]: "red",
  [ConstructionObjectStatus.Completed]: "green",
  [ConstructionObjectStatus.Closed]: "purple",
};

export default function ObjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConstructionObjectStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ConstructionObjectDto | null>(null);
  const [viewTarget, setViewTarget] = useState<ConstructionObjectDto | null>(null);

  const { data, isLoading, isError, error, refetch } = useObjects({ page: 1, pageSize: 200 });
  const { data: customersData } = useCustomers({ page: 1, pageSize: 200 });
  const customers = customersData?.items ?? [];
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  const createMutation = useCreateObject();
  const updateMutation = useUpdateObject();

  const objects = data?.items ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return objects.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (query && !`${o.name} ${o.address ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [objects, search, statusFilter]);

  const kpis = useMemo(() => {
    const inProgress = objects.filter((o) => o.status === ConstructionObjectStatus.InProgress).length;
    const completed = objects.filter((o) => o.status === ConstructionObjectStatus.Completed).length;
    const suspended = objects.filter((o) => o.status === ConstructionObjectStatus.Suspended).length;
    return { total: objects.length, inProgress, completed, suspended };
  }, [objects]);

  const columns: DataTableColumn<ConstructionObjectDto>[] = [
    { key: "name", header: "Объект", sticky: "left", width: "220px", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    { key: "customer", header: "Заказчик", render: (row) => <span className="text-ink-secondary">{customerName(row.customerId)}</span> },
    { key: "address", header: "Адрес", render: (row) => <span className="text-ink-secondary">{row.address ?? "—"}</span> },
    {
      key: "status",
      header: "Статус",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{CONSTRUCTION_OBJECT_STATUS_LABEL[row.status]}</Badge>,
    },
    { key: "budget", header: "Бюджет", render: (row) => <span className="tabular text-ink">{row.budget !== null ? formatCurrency(row.budget) : "—"}</span> },
    { key: "plannedEndDate", header: "Плановое завершение", render: (row) => <span className="tabular text-ink-secondary">{row.plannedEndDate ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      width: "88px",
      sticky: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink" onClick={() => setViewTarget(row)} title="Смета и бюджет">
            <Eye size={15} />
          </button>
          <button type="button" className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink" onClick={() => setEditTarget(row)} title="Редактировать">
            <Pencil size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Объекты"
      subtitle="Строительные объекты компании"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск по названию, адресу" }}
      action={<Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Новый объект</Button>}
    >
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Всего объектов" value={String(kpis.total)} icon={Building2} tone="blue" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={Clock} tone="orange" />
        <MetricCard label="Завершено" value={String(kpis.completed)} icon={CheckCircle2} tone="green" />
        <MetricCard label="Приостановлено" value={String(kpis.suspended)} icon={Pause} tone="red" />
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <CustomSelect
          size="sm"
          value={String(statusFilter)}
          onValueChange={(v) => setStatusFilter(v === "all" ? "all" : (Number(v) as ConstructionObjectStatus))}
          options={[
            { value: "all", label: "Все статусы" },
            ...Object.entries(CONSTRUCTION_OBJECT_STATUS_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-4">{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}</div>
        ) : isError ? (
          <EmptyState icon={AlertTriangle} title="Не удалось загрузить объекты" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Объектов не найдено" description="Измените фильтры или создайте новый объект" />
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(row) => row.id} />
        )}
      </Card>

      <CreateObjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        customers={customers}
        submitting={createMutation.isPending}
        onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
      />

      <EditObjectModal
        object={editTarget}
        submitting={updateMutation.isPending}
        onClose={() => setEditTarget(null)}
        onSubmit={(request) => editTarget && updateMutation.mutate({ objectId: editTarget.id, request }, { onSuccess: () => setEditTarget(null) })}
      />

      <ObjectCostBreakdownModal object={viewTarget} onClose={() => setViewTarget(null)} />
    </AppLayout>
  );
}

function ObjectCostBreakdownModal({ object, onClose }: { object: ConstructionObjectDto | null; onClose: () => void }) {
  const { data, isLoading, isError, error } = useObjectCostBreakdown(object?.id);
  return (
    <Modal open={object !== null} onClose={onClose} title={object?.name ?? ""} description="Смета и факт (GET /objects/{id}/cost-breakdown)" size="md">
      {isLoading ? (
        <p className="text-sm text-ink-secondary">Загрузка...</p>
      ) : isError ? (
        <p className="text-sm text-red">{normalizeApiError(error).message}</p>
      ) : data ? (
        <div className="space-y-2 text-sm">
          <Row label="Материалы" value={formatCurrency(data.materialCost)} />
          <Row label="Сдельная зарплата" value={formatCurrency(data.pieceworkPayrollCost)} />
          <Row label="Почасовая зарплата" value={formatCurrency(data.hourlyPayrollCost)} />
          <Row label="Оплачиваемые отсутствия" value={formatCurrency(data.paidAbsencePayrollCost)} />
          <Row label="Итого" value={formatCurrency(data.totalCost)} strong />
          <p className="mt-2 text-xs text-ink-muted">{data.note}</p>
        </div>
      ) : null}
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-border py-1.5 ${strong ? "font-bold text-ink" : "text-ink-secondary"}`}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

function CreateObjectModal({
  open,
  onClose,
  customers,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  customers: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (request: { name: string; customerId: string; address?: string | null; startDate?: string | null; plannedEndDate?: string | null; budget?: number | null }) => void;
}) {
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");

  const createCustomerMutation = useCreateCustomer();
  const [newCustomerName, setNewCustomerName] = useState("");

  function reset() {
    setName(""); setCustomerId(""); setAddress(""); setStartDate(""); setPlannedEndDate(""); setBudget(""); setError(""); setNewCustomerName("");
  }
  function handleClose() { reset(); onClose(); }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !customerId) return setError("Укажите название и заказчика");
    onSubmit({
      name: name.trim(),
      customerId,
      address: address.trim() || null,
      startDate: startDate || null,
      plannedEndDate: plannedEndDate || null,
      budget: budget ? Number(budget) : null,
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Новый объект" size="md">
      <form className="users-modal-form" onSubmit={handleSubmit}>
        <label><span>Название</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="ЖК «Сомон»" /></label>
        <label>
          <span>Заказчик</span>
          <CustomSelect fullWidth value={customerId} onValueChange={setCustomerId} placeholder="Выберите заказчика" options={customers.map((c) => ({ value: c.id, label: c.name }))} />
        </label>
        {customers.length === 0 && (
          <div className="flex items-end gap-2">
            <label className="flex-1"><span>Новый заказчик</span><input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} /></label>
            <Button
              type="button"
              variant="secondary"
              disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
              onClick={() => createCustomerMutation.mutate({ name: newCustomerName.trim() }, { onSuccess: (c) => { setCustomerId(c.id); setNewCustomerName(""); } })}
            >
              Добавить
            </Button>
          </div>
        )}
        <label><span>Адрес</span><input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        <label><span>Дата начала</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label><span>Плановое завершение</span><input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} /></label>
        <label><span>Бюджет</span><input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Создание..." : "Создать"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditObjectModal({
  object,
  submitting,
  onClose,
  onSubmit,
}: {
  object: ConstructionObjectDto | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (request: { name: string; address?: string | null; status: ConstructionObjectStatus; startDate?: string | null; plannedEndDate?: string | null; actualEndDate?: string | null; budget?: number | null }) => void;
}) {
  const [name, setName] = useState(object?.name ?? "");
  const [address, setAddress] = useState(object?.address ?? "");
  const [status, setStatus] = useState<ConstructionObjectStatus>(object?.status ?? ConstructionObjectStatus.Planned);
  const [plannedEndDate, setPlannedEndDate] = useState(object?.plannedEndDate ?? "");
  const [actualEndDate, setActualEndDate] = useState(object?.actualEndDate ?? "");
  const [budget, setBudget] = useState(object?.budget != null ? String(object.budget) : "");

  if (!object) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      name: name.trim() || object!.name,
      address: address.trim() || null,
      status,
      startDate: object!.startDate,
      plannedEndDate: plannedEndDate || null,
      actualEndDate: actualEndDate || null,
      budget: budget ? Number(budget) : null,
    });
  }

  return (
    <Modal open={object !== null} onClose={onClose} title={`Редактировать: ${object.name}`} size="md">
      <form className="users-modal-form" onSubmit={handleSubmit}>
        <label><span>Название</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span>Адрес</span><input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        <label>
          <span>Статус</span>
          <CustomSelect fullWidth value={String(status)} onValueChange={(v) => setStatus(Number(v) as ConstructionObjectStatus)} options={Object.entries(CONSTRUCTION_OBJECT_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        </label>
        <label><span>Плановое завершение</span><input type="date" value={plannedEndDate ?? ""} onChange={(e) => setPlannedEndDate(e.target.value)} /></label>
        <label><span>Фактическое завершение</span><input type="date" value={actualEndDate ?? ""} onChange={(e) => setActualEndDate(e.target.value)} /></label>
        <label><span>Бюджет</span><input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Сохранение..." : "Сохранить"}</Button>
        </div>
      </form>
    </Modal>
  );
}

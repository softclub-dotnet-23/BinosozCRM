import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Building2, CheckCircle2, Eye, Flag, Loader2, Pencil, Plus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { StaggeredGrid } from "../components/ui/StaggeredGrid";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import "../styles/users.css";
import {
  createObject,
  getObjectCostBreakdown,
  listObjects,
  updateObject,
  type BackendObjectStatus,
  type ConstructionObject,
  type ObjectCostBreakdown,
} from "../api/objectsApi";
import { createCustomer, listCustomers, type Customer } from "../api/customersApi";
import { ObjectEstimateItems } from "../components/objects/ObjectEstimateItems";
import { formatCurrency } from "../utils/format";

const STATUS_OPTIONS: { value: BackendObjectStatus; label: string; tone: "blue" | "green" | "orange" | "purple" | "red" }[] = [
  { value: "Planned", label: "Планируется", tone: "blue" },
  { value: "InProgress", label: "В работе", tone: "green" },
  { value: "Suspended", label: "Приостановлен", tone: "orange" },
  { value: "Completed", label: "Завершён", tone: "purple" },
  { value: "Closed", label: "Закрыт", tone: "red" },
];

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label])) as Record<BackendObjectStatus, string>;
const STATUS_TONE = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.tone])) as Record<BackendObjectStatus, "blue" | "green" | "orange" | "purple" | "red">;

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const CREATE_FORM_INITIAL = { name: "", customerId: "", address: "", startDate: "", plannedEndDate: "", budget: "" };

export default function ObjectsPage() {
  const { showToast } = useToast();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");

  const [editTarget, setEditTarget] = useState<ConstructionObject | null>(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", status: "Planned" as BackendObjectStatus, startDate: "", plannedEndDate: "", actualEndDate: "", budget: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [viewTarget, setViewTarget] = useState<ConstructionObject | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<ObjectCostBreakdown | null>(null);
  const [costLoading, setCostLoading] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [objectsResult, customersResult] = await Promise.all([listObjects(1, 100), listCustomers(1, 100)]);
      setObjects(objectsResult.items);
      setCustomers(customersResult.items);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить объекты"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const customerNameById = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);

  const filteredObjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return objects.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (query) {
        const customerName = customerNameById.get(o.customerId) ?? "";
        if (!`${o.name} ${o.address ?? ""} ${customerName}`.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [objects, search, statusFilter, customerNameById]);

  const pageCount = Math.max(1, Math.ceil(filteredObjects.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredObjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const kpis = useMemo(() => ({
    total: objects.length,
    inProgress: objects.filter((o) => o.status === "InProgress").length,
    completed: objects.filter((o) => o.status === "Completed").length,
    suspended: objects.filter((o) => o.status === "Suspended").length,
  }), [objects]);

  function openCreate() {
    setCreateForm(CREATE_FORM_INITIAL);
    setCreateError("");
    setNewCustomerMode(false);
    setNewCustomerName("");
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    if (!createForm.name.trim()) {
      setCreateError("Укажите название объекта");
      return;
    }
    if (!newCustomerMode && !createForm.customerId) {
      setCreateError("Выберите заказчика");
      return;
    }
    if (newCustomerMode && !newCustomerName.trim()) {
      setCreateError("Укажите название заказчика");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      let customerId = createForm.customerId;
      if (newCustomerMode) {
        const customer = await createCustomer(newCustomerName.trim());
        setCustomers((current) => [customer, ...current]);
        customerId = customer.id;
      }

      const created = await createObject({
        name: createForm.name.trim(),
        customerId,
        address: createForm.address.trim() || undefined,
        startDate: createForm.startDate || undefined,
        plannedEndDate: createForm.plannedEndDate || undefined,
        budget: createForm.budget ? Number(createForm.budget) : undefined,
      });
      setObjects((current) => [created, ...current]);
      setCreateOpen(false);
      showToast("Объект успешно добавлен");
    } catch (error) {
      setCreateError(describeError(error, "Не удалось создать объект"));
    } finally {
      setCreating(false);
    }
  }

  function openEdit(object: ConstructionObject) {
    setEditTarget(object);
    setEditForm({
      name: object.name,
      address: object.address ?? "",
      status: object.status,
      startDate: object.startDate ?? "",
      plannedEndDate: object.plannedEndDate ?? "",
      actualEndDate: object.actualEndDate ?? "",
      budget: object.budget != null ? String(object.budget) : "",
    });
    setEditError("");
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editTarget || savingEdit) return;
    if (!editForm.name.trim()) {
      setEditError("Укажите название объекта");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    try {
      const updated = await updateObject(editTarget.id, {
        name: editForm.name.trim(),
        address: editForm.address.trim() || undefined,
        status: editForm.status,
        startDate: editForm.startDate || undefined,
        plannedEndDate: editForm.plannedEndDate || undefined,
        actualEndDate: editForm.actualEndDate || undefined,
        budget: editForm.budget ? Number(editForm.budget) : undefined,
      });
      setObjects((current) => current.map((o) => (o.id === updated.id ? updated : o)));
      setEditTarget(null);
      showToast("Объект обновлён");
    } catch (error) {
      setEditError(describeError(error, "Не удалось сохранить изменения"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function openView(object: ConstructionObject) {
    setViewTarget(object);
    setCostBreakdown(null);
    setCostLoading(true);
    try {
      const breakdown = await getObjectCostBreakdown(object.id);
      setCostBreakdown(breakdown);
    } catch {
      // cost breakdown is supplementary — the view still shows the object's own fields without it
    } finally {
      setCostLoading(false);
    }
  }

  const columns: DataTableColumn<ConstructionObject>[] = [
    {
      key: "name",
      header: "Объект",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Building2 size={16} /></div>
          <span className="font-semibold text-ink">{row.name}</span>
        </div>
      ),
    },
    { key: "customer", header: "Заказчик", render: (row) => <span className="text-ink-secondary">{customerNameById.get(row.customerId) ?? "—"}</span> },
    { key: "address", header: "Адрес", render: (row) => <span className="text-ink-secondary">{row.address ?? "—"}</span> },
    { key: "budget", header: "Бюджет", render: (row) => <span className="tabular text-ink">{row.budget != null ? formatCurrency(row.budget) : "—"}</span> },
    { key: "plannedEndDate", header: "Плановый срок", render: (row) => <span className="text-ink-secondary">{row.plannedEndDate ?? "—"}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть" onClick={() => void openView(row)} className="rounded-lg p-1.5 text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink"><Eye size={16} /></button>
          <button type="button" aria-label="Редактировать" onClick={() => openEdit(row)} className="rounded-lg p-1.5 text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink"><Pencil size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Объекты"
      subtitle="Управление строительными объектами и их статусами"
      search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: "Поиск объектов, адресов, заказчиков..." }}
    >
      <StaggeredGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Всего объектов" value={String(kpis.total)} icon={Building2} tone="orange" footer="Все проекты компании" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={CheckCircle2} tone="green" footer="Активные объекты" />
        <MetricCard label="Завершены" value={String(kpis.completed)} icon={Flag} tone="blue" footer="Закрытые проекты" />
        <MetricCard label="Приостановлены" value={String(kpis.suspended)} icon={AlertCircle} tone="red" footer="Требуют внимания" />
      </StaggeredGrid>

      {loadState === "error" && (
        <Card style={{ marginTop: 16, padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void loadAll()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ marginTop: 16, padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Список объектов</h2>
            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect
                size="sm"
                value={statusFilter}
                onValueChange={(value) => { setStatusFilter(value); setPage(1); }}
                options={[{ value: "all", label: "Все статусы" }, ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))]}
              />
              <Button size="sm" onClick={openCreate}><Plus size={14} /> Добавить объект</Button>
            </div>
          </div>

          <div className="mt-4">
            {pageRows.length > 0 ? (
              <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={Building2} title="Объекты не найдены" description="Измените параметры поиска или добавьте первый объект" />
            )}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredObjects.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            pageSizeOptions={[10, 20, 50]}
          />
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Добавить объект" size="md">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label><span>Название</span><input value={createForm.name} onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))} placeholder="ЖК «Сомони»" autoFocus /></label>

          {!newCustomerMode ? (
            <label>
              <span>Заказчик</span>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <CustomSelect fullWidth value={createForm.customerId} onValueChange={(v) => setCreateForm((c) => ({ ...c, customerId: v }))} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
                </div>
                <Button type="button" variant="secondary" onClick={() => setNewCustomerMode(true)}>Новый</Button>
              </div>
            </label>
          ) : (
            <label>
              <span>Новый заказчик</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Название заказчика" />
                <Button type="button" variant="secondary" onClick={() => setNewCustomerMode(false)}>Отмена</Button>
              </div>
            </label>
          )}

          <label><span>Адрес</span><input value={createForm.address} onChange={(e) => setCreateForm((c) => ({ ...c, address: e.target.value }))} placeholder="Адрес объекта" /></label>
          <label><span>Дата начала</span><input type="date" value={createForm.startDate} onChange={(e) => setCreateForm((c) => ({ ...c, startDate: e.target.value }))} /></label>
          <label><span>Плановая дата завершения</span><input type="date" value={createForm.plannedEndDate} onChange={(e) => setCreateForm((c) => ({ ...c, plannedEndDate: e.target.value }))} /></label>
          <label><span>Бюджет</span><input type="number" min="0" step="0.01" value={createForm.budget} onChange={(e) => setCreateForm((c) => ({ ...c, budget: e.target.value }))} placeholder="0" /></label>
          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creating}>{creating ? "Создание..." : "Создать"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={editTarget !== null} onClose={() => setEditTarget(null)} title="Редактировать объект" description={editTarget?.name} size="md">
        <form className="users-modal-form" onSubmit={submitEdit}>
          <label><span>Название</span><input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></label>
          <label><span>Адрес</span><input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} /></label>
          <label><span>Статус</span><CustomSelect fullWidth value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as BackendObjectStatus }))} options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))} /></label>
          <label><span>Дата начала</span><input type="date" value={editForm.startDate} onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))} /></label>
          <label><span>Плановая дата завершения</span><input type="date" value={editForm.plannedEndDate} onChange={(e) => setEditForm((f) => ({ ...f, plannedEndDate: e.target.value }))} /></label>
          <label><span>Фактическая дата завершения</span><input type="date" value={editForm.actualEndDate} onChange={(e) => setEditForm((f) => ({ ...f, actualEndDate: e.target.value }))} /></label>
          <label><span>Бюджет</span><input type="number" min="0" step="0.01" value={editForm.budget} onChange={(e) => setEditForm((f) => ({ ...f, budget: e.target.value }))} /></label>
          {editError && <p className="users-modal-error" role="alert">{editError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={savingEdit}>{savingEdit ? "Сохранение..." : "Сохранить"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={viewTarget !== null} onClose={() => setViewTarget(null)} title="Объект" description={viewTarget?.name} size="lg">
        {viewTarget && (
          <div className="flex flex-col gap-5">
            <div className="users-modal-form">
              <label><span>Заказчик</span><input readOnly value={customerNameById.get(viewTarget.customerId) ?? "—"} /></label>
              <label><span>Адрес</span><input readOnly value={viewTarget.address ?? "—"} /></label>
              <label><span>Статус</span><input readOnly value={STATUS_LABEL[viewTarget.status]} /></label>
              <label><span>Бюджет</span><input readOnly value={viewTarget.budget != null ? formatCurrency(viewTarget.budget) : "—"} /></label>
              {costLoading && <p className="text-sm text-ink-muted">Загрузка расходов...</p>}
              {costBreakdown && (
                <>
                  <label><span>Материалы</span><input readOnly value={formatCurrency(costBreakdown.materialCost)} /></label>
                  <label><span>Сдельная оплата</span><input readOnly value={formatCurrency(costBreakdown.pieceworkPayrollCost)} /></label>
                  <label><span>Почасовая оплата</span><input readOnly value={formatCurrency(costBreakdown.hourlyPayrollCost)} /></label>
                  <label><span>Оплачиваемые отсутствия</span><input readOnly value={formatCurrency(costBreakdown.paidAbsencePayrollCost)} /></label>
                  <label><span>Итого расходов</span><input readOnly value={formatCurrency(costBreakdown.totalCost)} /></label>
                  <p className="text-xs text-ink-muted">{costBreakdown.note}</p>
                </>
              )}
            </div>

            <ObjectEstimateItems objectId={viewTarget.id} />

            <div className="users-modal-actions"><Button type="button" variant="secondary" onClick={() => setViewTarget(null)}>Закрыть</Button></div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

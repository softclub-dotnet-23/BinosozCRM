import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, Plus, UserMinus, Users, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import { listBrigades, type Brigade } from "../api/brigadesApi";
import { changeWorkerPayRate, createWorker, listAllWorkers, terminateWorker, type PayRateType, type Worker } from "../api/workersApi";
import { formatCurrency } from "../utils/format";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    switch (error.code) {
      case "WORKER_NOT_FOUND":
        return "Сотрудник не найден";
      case "PAY_RATE_EFFECTIVE_DATE_CONFLICT":
        return "Дата вступления в силу должна быть позже даты последнего изменения ставки";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}

const RATE_FORM_INITIAL = { payRateType: "Hourly" as PayRateType, payRate: "", effectiveFrom: "" };

const PAY_RATE_LABEL: Record<PayRateType, string> = { Hourly: "Почасовая", Piecework: "Сдельная" };

const CREATE_FORM_INITIAL = {
  brigadeId: "",
  fullName: "",
  phone: "",
  birthDate: "",
  payRateType: "Hourly" as PayRateType,
  payRate: "",
  hireDate: "",
  specialty: "",
};

export default function EmployeesPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "terminated">("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [terminateTarget, setTerminateTarget] = useState<Worker | null>(null);
  const [terminateDate, setTerminateDate] = useState("");
  const [terminateError, setTerminateError] = useState("");
  const [terminating, setTerminating] = useState(false);

  const isOwner = currentUser?.role === "owner";
  const [rateTarget, setRateTarget] = useState<Worker | null>(null);
  const [rateForm, setRateForm] = useState(RATE_FORM_INITIAL);
  const [rateError, setRateError] = useState("");
  const [rateConfirmOpen, setRateConfirmOpen] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const brigadesResult = await listBrigades(1, 100);
      setBrigades(brigadesResult.items);
      const allWorkers = await listAllWorkers(brigadesResult.items.map((b) => b.id), true);
      setWorkers(allWorkers);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить сотрудников"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const brigadeNameById = useMemo(() => new Map(brigades.map((b) => [b.id, b.name])), [brigades]);

  const filteredWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workers.filter((w) => {
      if (statusFilter === "active" && !w.isActive) return false;
      if (statusFilter === "terminated" && w.isActive) return false;
      if (query && !`${w.fullName} ${w.phone} ${w.specialty ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [workers, search, statusFilter]);

  const kpis = useMemo(() => ({
    total: workers.length,
    active: workers.filter((w) => w.isActive).length,
    terminated: workers.filter((w) => !w.isActive).length,
  }), [workers]);

  function openCreate() {
    setCreateForm({ ...CREATE_FORM_INITIAL, brigadeId: brigades[0]?.id ?? "" });
    setCreateError("");
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    const { brigadeId, fullName, phone, birthDate, hireDate, payRate } = createForm;
    if (!brigadeId || !fullName.trim() || !phone.trim() || !birthDate || !hireDate) {
      setCreateError("Заполните бригаду, ФИО, телефон, дату рождения и дату найма");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createWorker(brigadeId, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        birthDate,
        payRateType: createForm.payRateType,
        payRate: Number(payRate) || 0,
        hireDate,
        specialty: createForm.specialty.trim() || undefined,
      });
      setWorkers((current) => [created, ...current]);
      setCreateOpen(false);
      showToast("Сотрудник добавлен");
    } catch (error) {
      setCreateError(describeError(error, "Не удалось добавить сотрудника"));
    } finally {
      setCreating(false);
    }
  }

  function openTerminate(worker: Worker) {
    setTerminateTarget(worker);
    setTerminateDate(new Date().toISOString().slice(0, 10));
    setTerminateError("");
  }

  async function submitTerminate(event: FormEvent) {
    event.preventDefault();
    if (!terminateTarget || terminating) return;
    setTerminating(true);
    setTerminateError("");
    try {
      const updated = await terminateWorker(terminateTarget.id, terminateDate);
      setWorkers((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      setTerminateTarget(null);
      showToast("Сотрудник уволен");
    } catch (error) {
      setTerminateError(describeError(error, "Не удалось уволить сотрудника"));
    } finally {
      setTerminating(false);
    }
  }

  function openRateChange(worker: Worker) {
    setRateTarget(worker);
    setRateForm(RATE_FORM_INITIAL);
    setRateError("");
    setRateConfirmOpen(false);
  }

  function submitRateForm(event: FormEvent) {
    event.preventDefault();
    const rate = Number(rateForm.payRate);
    if (!rateForm.payRate.trim() || Number.isNaN(rate) || (rateForm.payRateType === "Hourly" ? rate <= 0 : rate < 0)) {
      setRateError(
        rateForm.payRateType === "Hourly"
          ? "Почасовая ставка должна быть больше нуля"
          : "Сдельная ставка не может быть отрицательной",
      );
      return;
    }
    if (!rateForm.effectiveFrom) {
      setRateError("Укажите дату вступления в силу");
      return;
    }
    setRateError("");
    setRateConfirmOpen(true);
  }

  async function confirmRateChange() {
    if (!rateTarget || savingRate) return;
    setSavingRate(true);
    try {
      const updated = await changeWorkerPayRate(rateTarget.id, {
        payRateType: rateForm.payRateType,
        payRate: Number(rateForm.payRate),
        effectiveFrom: rateForm.effectiveFrom,
      });
      setWorkers((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      setRateTarget(null);
      showToast("Ставка обновлена");
    } catch (error) {
      showToast(describeError(error, "Не удалось изменить ставку"), "error");
    } finally {
      setSavingRate(false);
    }
  }

  const columns: DataTableColumn<Worker>[] = [
    { key: "fullName", header: "Сотрудник", render: (row) => <span className="font-semibold text-ink">{row.fullName}</span> },
    { key: "brigade", header: "Бригада", render: (row) => <span className="text-ink-secondary">{brigadeNameById.get(row.brigadeId) ?? "—"}</span> },
    { key: "specialty", header: "Специальность", render: (row) => <span className="text-ink-secondary">{row.specialty ?? "—"}</span> },
    { key: "phone", header: "Телефон", render: (row) => <span className="nowrap">{row.phone}</span> },
    {
      key: "payRate",
      header: "Ставка",
      render: (row) =>
        row.payRateType && row.payRate != null ? (
          <span className="tabular text-ink">{formatCurrency(row.payRate)} · {PAY_RATE_LABEL[row.payRateType]}</span>
        ) : (
          <span className="text-ink-muted" title="Доступно только Owner/Accountant">Скрыто</span>
        ),
    },
    { key: "status", header: "Статус", render: (row) => <Badge tone={row.isActive ? "green" : "red"}>{row.isActive ? "Активен" : "Уволен"}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) =>
        row.isActive ? (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {isOwner && (
              <Button size="sm" variant="secondary" onClick={() => openRateChange(row)}><Wallet size={13} /> Ставка</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => openTerminate(row)}><UserMinus size={13} /> Уволить</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <AppLayout
      title="Сотрудники"
      subtitle="Работники, числящиеся в бригадах"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск по имени, телефону, специальности..." }}
      action={<Button onClick={openCreate} disabled={brigades.length === 0}><Plus size={15} /> Добавить сотрудника</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего сотрудников" value={String(kpis.total)} icon={Users} tone="orange" footer="Во всех бригадах" />
        <MetricCard label="Активные" value={String(kpis.active)} icon={Users} tone="green" footer="Числятся в бригаде" />
        <MetricCard label="Уволены" value={String(kpis.terminated)} icon={Users} tone="red" footer="Более не активны" />
      </div>

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
            <h2 className="text-[17px] font-bold text-ink">Список сотрудников</h2>
            <CustomSelect
              size="sm"
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[{ value: "all", label: "Все" }, { value: "active", label: "Активные" }, { value: "terminated", label: "Уволенные" }]}
            />
          </div>
          <div className="mt-4">
            {filteredWorkers.length > 0 ? (
              <DataTable columns={columns} rows={filteredWorkers} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={Users} title="Сотрудники не найдены" description="Измените параметры поиска или добавьте сотрудника" />
            )}
          </div>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Добавить сотрудника" size="md">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label><span>Бригада</span><CustomSelect fullWidth value={createForm.brigadeId} onValueChange={(v) => setCreateForm((f) => ({ ...f, brigadeId: v }))} options={brigades.map((b) => ({ value: b.id, label: b.name }))} /></label>
          <label><span>ФИО</span><input value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} autoFocus /></label>
          <label><span>Телефон</span><input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+992 00 000 00 00" /></label>
          <label><span>Дата рождения</span><input type="date" value={createForm.birthDate} onChange={(e) => setCreateForm((f) => ({ ...f, birthDate: e.target.value }))} /></label>
          <label><span>Дата найма</span><input type="date" value={createForm.hireDate} onChange={(e) => setCreateForm((f) => ({ ...f, hireDate: e.target.value }))} /></label>
          <label><span>Тип оплаты</span><CustomSelect fullWidth value={createForm.payRateType} onValueChange={(v) => setCreateForm((f) => ({ ...f, payRateType: v as PayRateType }))} options={[{ value: "Hourly", label: "Почасовая" }, { value: "Piecework", label: "Сдельная" }]} /></label>
          <label><span>Ставка</span><input type="number" min="0" step="0.01" value={createForm.payRate} onChange={(e) => setCreateForm((f) => ({ ...f, payRate: e.target.value }))} /></label>
          <label><span>Специальность</span><input value={createForm.specialty} onChange={(e) => setCreateForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="Каменщик" /></label>
          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creating}>{creating ? "Добавление..." : "Добавить"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={terminateTarget !== null} onClose={() => setTerminateTarget(null)} title="Уволить сотрудника" description={terminateTarget?.fullName} size="sm">
        <form className="users-modal-form" onSubmit={submitTerminate}>
          <label><span>Дата увольнения</span><input type="date" value={terminateDate} onChange={(e) => setTerminateDate(e.target.value)} /></label>
          {terminateError && <p className="users-modal-error" role="alert">{terminateError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setTerminateTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={terminating}>{terminating ? "Сохранение..." : "Уволить"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={rateTarget !== null && !rateConfirmOpen && !savingRate} onClose={() => setRateTarget(null)} title="Изменить ставку" description={rateTarget?.fullName} size="sm">
        <form className="users-modal-form" onSubmit={submitRateForm}>
          <p className="col-span-2 text-sm text-ink-secondary">
            Текущая ставка:{" "}
            {rateTarget?.payRateType && rateTarget.payRate != null
              ? `${formatCurrency(rateTarget.payRate)} · ${PAY_RATE_LABEL[rateTarget.payRateType]}`
              : "не указана"}
          </p>
          <label>
            <span>Тип оплаты</span>
            <CustomSelect
              fullWidth
              value={rateForm.payRateType}
              onValueChange={(v) => setRateForm((f) => ({ ...f, payRateType: v as PayRateType }))}
              options={[{ value: "Hourly", label: "Почасовая" }, { value: "Piecework", label: "Сдельная" }]}
            />
          </label>
          <label>
            <span>Новая ставка</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rateForm.payRate}
              aria-invalid={rateError ? true : undefined}
              onChange={(e) => setRateForm((f) => ({ ...f, payRate: e.target.value }))}
            />
          </label>
          <label>
            <span>Действует с</span>
            <input
              type="date"
              value={rateForm.effectiveFrom}
              aria-invalid={rateError ? true : undefined}
              onChange={(e) => setRateForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
            />
          </label>
          {rateError && <p className="users-modal-error" role="alert">{rateError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setRateTarget(null)}>Отмена</Button>
            <Button type="submit">Далее</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={rateTarget !== null && rateConfirmOpen}
        onClose={() => setRateConfirmOpen(false)}
        title="Подтвердите изменение ставки"
        description={rateTarget?.fullName}
        note={
          <>
            Новая ставка: {rateForm.payRate ? formatCurrency(Number(rateForm.payRate)) : "—"} · {PAY_RATE_LABEL[rateForm.payRateType]}
            <br />
            Действует с: {rateForm.effectiveFrom || "—"}
          </>
        }
        confirmLabel={savingRate ? "Сохранение..." : "Сохранить"}
        onConfirm={() => void confirmRateChange()}
      />
    </AppLayout>
  );
}

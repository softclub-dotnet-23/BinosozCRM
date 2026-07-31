import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, Plus, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { ApiError, NetworkError } from "../api/apiClient";
import {
  adjustPayrollEntry,
  approvePayrollEntry,
  createPayrollAdvance,
  createPayrollEntry,
  listPayrollAdvances,
  listPayrollEntries,
  payPayrollEntry,
  type PayrollAdvance,
  type PayrollEntry,
  type PayrollEntryStatus,
} from "../api/payrollApi";
import { listBrigades } from "../api/brigadesApi";
import { listAllWorkers, type Worker } from "../api/workersApi";
import { formatCurrency } from "../utils/format";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const STATUS_LABEL: Record<PayrollEntryStatus, string> = { Draft: "Черновик", Approved: "Утверждено", Paid: "Выплачено" };
const STATUS_TONE: Record<PayrollEntryStatus, "blue" | "green" | "orange"> = { Draft: "orange", Approved: "blue", Paid: "green" };

const CREATE_FORM_INITIAL = { workerId: "", periodStart: "", periodEnd: "" };

export default function PayrollPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canCreate = user?.role === "accountant";
  const canApprovePay = user?.role === "owner" || user?.role === "accountant";
  const canAdjust = user?.role === "accountant";

  const [tab, setTab] = useState<"entries" | "advances">("entries");
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [advances, setAdvances] = useState<PayrollAdvance[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ workerId: "", amount: "", note: "" });
  const [advanceError, setAdvanceError] = useState("");
  const [creatingAdvance, setCreatingAdvance] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<PayrollEntry | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [entriesResult, advancesResult, brigadesResult] = await Promise.all([
        listPayrollEntries(1, 100),
        listPayrollAdvances(1, 100),
        listBrigades(1, 100),
      ]);
      setEntries(entriesResult.items);
      setAdvances(advancesResult.items);
      setWorkers(await listAllWorkers(brigadesResult.items.map((b) => b.id)));
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить данные по зарплате"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const workerNameById = useMemo(() => new Map(workers.map((w) => [w.id, w.fullName])), [workers]);

  const kpis = useMemo(() => ({
    total: entries.length,
    draft: entries.filter((e) => e.status === "Draft").length,
    totalPaid: entries.filter((e) => e.status === "Paid").reduce((sum, e) => sum + (e.finalAmount ?? 0), 0),
  }), [entries]);

  function openCreate() {
    setCreateForm({ ...CREATE_FORM_INITIAL, workerId: workers[0]?.id ?? "" });
    setCreateError("");
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    const { workerId, periodStart, periodEnd } = createForm;
    if (!workerId || !periodStart || !periodEnd) {
      setCreateError("Заполните работника и период");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createPayrollEntry(workerId, periodStart, periodEnd);
      setEntries((current) => [created, ...current.filter((e) => e.id !== created.id)]);
      setCreateOpen(false);
      showToast("Начисление создано");
    } catch (error) {
      setCreateError(describeError(error, "Не удалось создать начисление"));
    } finally {
      setCreating(false);
    }
  }

  async function handleApprove(entry: PayrollEntry) {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      const updated = await approvePayrollEntry(entry.id);
      setEntries((current) => current.map((e) => (e.id === updated.id ? updated : e)));
      showToast("Начисление утверждено");
    } catch (error) {
      showToast(describeError(error, "Не удалось утвердить начисление"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(entry: PayrollEntry) {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      const updated = await payPayrollEntry(entry.id);
      setEntries((current) => current.map((e) => (e.id === updated.id ? updated : e)));
      showToast("Выплата проведена");
    } catch (error) {
      showToast(describeError(error, "Не удалось провести выплату"), "error");
    } finally {
      setBusyId(null);
    }
  }

  function openAdjust(entry: PayrollEntry) {
    setAdjustTarget(entry);
    setAdjustAmount(String(entry.adjustmentAmount || ""));
    setAdjustReason(entry.adjustmentReason ?? "");
    setAdjustError("");
  }

  async function submitAdjust(event: FormEvent) {
    event.preventDefault();
    if (!adjustTarget || adjusting) return;
    const amount = Number(adjustAmount);
    if (amount !== 0 && !adjustReason.trim()) {
      setAdjustError("Причина обязательна при ненулевой корректировке");
      return;
    }
    setAdjusting(true);
    setAdjustError("");
    try {
      const updated = await adjustPayrollEntry(adjustTarget.id, amount, adjustReason.trim() || undefined);
      setEntries((current) => current.map((e) => (e.id === updated.id ? updated : e)));
      setAdjustTarget(null);
      showToast("Корректировка сохранена");
    } catch (error) {
      setAdjustError(describeError(error, "Не удалось сохранить корректировку"));
    } finally {
      setAdjusting(false);
    }
  }

  function openAdvance() {
    setAdvanceForm({ workerId: workers[0]?.id ?? "", amount: "", note: "" });
    setAdvanceError("");
    setAdvanceOpen(true);
  }

  async function submitAdvance(event: FormEvent) {
    event.preventDefault();
    if (creatingAdvance) return;
    if (!advanceForm.workerId || !advanceForm.amount || Number(advanceForm.amount) <= 0) {
      setAdvanceError("Выберите работника и укажите сумму больше нуля");
      return;
    }
    setCreatingAdvance(true);
    setAdvanceError("");
    try {
      const created = await createPayrollAdvance(advanceForm.workerId, Number(advanceForm.amount), advanceForm.note.trim() || undefined);
      setAdvances((current) => [created, ...current]);
      setAdvanceOpen(false);
      showToast("Аванс выдан");
    } catch (error) {
      setAdvanceError(describeError(error, "Не удалось выдать аванс"));
    } finally {
      setCreatingAdvance(false);
    }
  }

  const entryColumns: DataTableColumn<PayrollEntry>[] = [
    { key: "worker", header: "Работник", render: (row) => <span className="font-semibold text-ink">{workerNameById.get(row.workerId) ?? "—"}</span> },
    { key: "period", header: "Период", render: (row) => <span className="text-ink-secondary">{row.periodStart} — {row.periodEnd}</span> },
    { key: "calculated", header: "Начислено", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.calculatedAmount)}</span> },
    { key: "deductions", header: "Вычеты", render: (row) => <span className="tabular text-red">−{formatCurrency(row.latenessDeductionAmount + row.advanceDeductedAmount)}</span> },
    { key: "final", header: "К выплате", render: (row) => <span className="tabular font-semibold text-ink">{row.finalAmount != null ? formatCurrency(row.finalAmount) : "—"}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {canAdjust && row.status === "Draft" && <Button size="sm" variant="secondary" onClick={() => openAdjust(row)}>Корректировка</Button>}
          {canApprovePay && row.status === "Draft" && <Button size="sm" disabled={busyId === row.id} onClick={() => void handleApprove(row)}>Утвердить</Button>}
          {canApprovePay && row.status === "Approved" && <Button size="sm" disabled={busyId === row.id} onClick={() => void handlePay(row)}>Выплатить</Button>}
        </div>
      ),
    },
  ];

  const advanceColumns: DataTableColumn<PayrollAdvance>[] = [
    { key: "worker", header: "Работник", render: (row) => <span className="font-semibold text-ink">{workerNameById.get(row.workerId) ?? "—"}</span> },
    { key: "amount", header: "Сумма", render: (row) => <span className="tabular text-ink">{formatCurrency(row.amount)}</span> },
    { key: "issuedAt", header: "Дата выдачи", render: (row) => <span className="text-ink-secondary">{new Date(row.issuedAt).toLocaleDateString("ru-RU")}</span> },
    { key: "settled", header: "Статус", render: (row) => <Badge tone={row.settledInPayrollEntryId ? "green" : "orange"}>{row.settledInPayrollEntryId ? "Зачтён" : "Не зачтён"}</Badge> },
    { key: "note", header: "Примечание", render: (row) => <span className="text-ink-secondary">{row.note ?? "—"}</span> },
  ];

  return (
    <AppLayout
      title="Зарплата"
      subtitle="Начисления, авансы и выплаты"
      action={
        tab === "entries"
          ? canCreate ? <Button onClick={openCreate} disabled={workers.length === 0}><Plus size={15} /> Создать начисление</Button> : undefined
          : (user?.role === "owner" || user?.role === "accountant") ? <Button onClick={openAdvance} disabled={workers.length === 0}><Plus size={15} /> Выдать аванс</Button> : undefined
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего начислений" value={String(kpis.total)} icon={Wallet} tone="orange" footer="За все периоды" />
        <MetricCard label="Черновиков" value={String(kpis.draft)} icon={Wallet} tone="blue" footer="Ожидают утверждения" />
        <MetricCard label="Выплачено" value={formatCurrency(kpis.totalPaid)} icon={Wallet} tone="green" footer="По оплаченным начислениям" />
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
          <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-6">
            <button type="button" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${tab === "entries" ? "bg-primary text-white" : "bg-[#F5F5F4] text-ink-secondary"}`} onClick={() => setTab("entries")}>Начисления</button>
            <button type="button" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${tab === "advances" ? "bg-primary text-white" : "bg-[#F5F5F4] text-ink-secondary"}`} onClick={() => setTab("advances")}>Авансы</button>
          </div>
          <div className="mt-4">
            {tab === "entries" ? (
              entries.length > 0 ? <DataTable columns={entryColumns} rows={entries} rowKey={(row) => row.id} /> : <EmptyState icon={Wallet} title="Начислений пока нет" description="Создайте первое начисление" />
            ) : advances.length > 0 ? (
              <DataTable columns={advanceColumns} rows={advances} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={Wallet} title="Авансов пока нет" description="Здесь появятся выданные авансы" />
            )}
          </div>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Создать начисление" size="sm">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label><span>Работник</span><CustomSelect fullWidth value={createForm.workerId} onValueChange={(v) => setCreateForm((f) => ({ ...f, workerId: v }))} options={workers.map((w) => ({ value: w.id, label: w.fullName }))} /></label>
          <label><span>Начало периода</span><input type="date" value={createForm.periodStart} onChange={(e) => setCreateForm((f) => ({ ...f, periodStart: e.target.value }))} /></label>
          <label><span>Конец периода</span><input type="date" value={createForm.periodEnd} onChange={(e) => setCreateForm((f) => ({ ...f, periodEnd: e.target.value }))} /></label>
          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creating}>{creating ? "Создание..." : "Создать"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={advanceOpen} onClose={() => setAdvanceOpen(false)} title="Выдать аванс" size="sm">
        <form className="users-modal-form" onSubmit={submitAdvance}>
          <label><span>Работник</span><CustomSelect fullWidth value={advanceForm.workerId} onValueChange={(v) => setAdvanceForm((f) => ({ ...f, workerId: v }))} options={workers.map((w) => ({ value: w.id, label: w.fullName }))} /></label>
          <label><span>Сумма</span><input type="number" min="0" step="0.01" value={advanceForm.amount} onChange={(e) => setAdvanceForm((f) => ({ ...f, amount: e.target.value }))} /></label>
          <label><span>Примечание</span><input value={advanceForm.note} onChange={(e) => setAdvanceForm((f) => ({ ...f, note: e.target.value }))} /></label>
          {advanceError && <p className="users-modal-error" role="alert">{advanceError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAdvanceOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creatingAdvance}>{creatingAdvance ? "Сохранение..." : "Выдать"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={adjustTarget !== null} onClose={() => setAdjustTarget(null)} title="Корректировка начисления" size="sm">
        <form className="users-modal-form" onSubmit={submitAdjust}>
          <label><span>Сумма корректировки</span><input type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Может быть отрицательной" /></label>
          <label><span>Причина</span><input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} /></label>
          {adjustError && <p className="users-modal-error" role="alert">{adjustError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAdjustTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={adjusting}>{adjusting ? "Сохранение..." : "Сохранить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}

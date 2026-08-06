import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Gauge, Plus, UserRoundCheck, UserRoundIcon, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { CustomSelect } from "../components/ui/CustomSelect";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { useBrigades } from "../hooks/api/useBrigades";
import { useBrigadeWorkers, useCreateWorker, useTerminateWorker } from "../hooks/api/useWorkers";
import { normalizeApiError } from "../services/apiError";
import { PayRateType } from "../services/types";
import type { WorkerDto } from "../services/workersApi";

export default function BrigadeCompositionPage() {
  const [selectedBrigadeId, setSelectedBrigadeId] = useState<string>("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<WorkerDto | null>(null);

  const { data: brigadesData, isLoading: brigadesLoading } = useBrigades({ page: 1, pageSize: 200 });
  const brigades = brigadesData?.items ?? [];
  const activeBrigadeId = selectedBrigadeId || brigades[0]?.id || "";

  const { data, isLoading, isError, error, refetch } = useBrigadeWorkers(activeBrigadeId, { page: 1, pageSize: 200, includeInactive });
  const createMutation = useCreateWorker();
  const terminateMutation = useTerminateWorker();

  const members = data?.items ?? [];
  const kpis = useMemo(() => {
    const active = members.filter((m) => m.isActive).length;
    const specialties = new Set(members.filter((m) => m.isActive).map((m) => m.specialty).filter(Boolean)).size;
    return { total: members.length, active, specialties };
  }, [members]);

  const columns: DataTableColumn<WorkerDto>[] = [
    {
      key: "employee",
      header: "Сотрудник",
      sticky: "left",
      width: "220px",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.fullName} size="sm" />
          <div className="min-w-0"><p className="truncate font-semibold text-ink">{row.fullName}</p><p className="truncate text-xs text-ink-muted">{row.phone}</p></div>
        </div>
      ),
    },
    { key: "specialty", header: "Специальность", render: (row) => <span className="text-ink-secondary">{row.specialty ?? "—"}</span> },
    { key: "hireDate", header: "В бригаде с", render: (row) => <span className="tabular text-ink-secondary">{row.hireDate}</span> },
    { key: "status", header: "Статус", render: (row) => <span className={`user-status ${row.isActive ? "active" : "inactive"}`}>{row.isActive ? "Активен" : "Уволен"}</span> },
    {
      key: "actions",
      header: "",
      width: "48px",
      sticky: "right",
      render: (row) => (
        <div className="flex items-center justify-end">
          <DropdownMenu
            trigger={<UserRoundIcon size={16} />}
            items={[{ label: "Уволить", onClick: () => setTerminateTarget(row), disabled: !row.isActive }]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Состав бригад" subtitle="Управление составом конкретной бригады">
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <CustomSelect
          size="sm"
          value={activeBrigadeId}
          onValueChange={setSelectedBrigadeId}
          placeholder="Выберите бригаду"
          options={brigades.map((b) => ({ value: b.id, label: b.name }))}
        />
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Показать уволенных
        </label>
        <Button className="ml-auto" onClick={() => setAddOpen(true)} disabled={!activeBrigadeId}><Plus size={15} /> Добавить сотрудника</Button>
      </Card>

      {!brigadesLoading && brigades.length === 0 ? (
        <EmptyState icon={UsersRound} title="Бригад пока нет" description="Создайте бригаду на странице «Бригады»" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Всего в бригаде" value={String(kpis.total)} icon={UsersRound} tone="blue" />
            <MetricCard label="Активны" value={String(kpis.active)} icon={UserRoundCheck} tone="green" />
            <MetricCard label="Специальностей" value={String(kpis.specialties)} icon={Gauge} tone="purple" />
          </div>

          <Card>
            {isLoading ? (
              <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)}</div>
            ) : isError ? (
              <EmptyState icon={AlertCircle} title="Не удалось загрузить состав" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
            ) : members.length === 0 ? (
              <EmptyState icon={UsersRound} title="В этой бригаде пока никого нет" description="Добавьте первого сотрудника" />
            ) : (
              <DataTable columns={columns} rows={members} rowKey={(row) => row.id} />
            )}
          </Card>
        </>
      )}

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        submitting={createMutation.isPending}
        onSubmit={(request) =>
          createMutation.mutate(
            { brigadeId: activeBrigadeId, request },
            { onSuccess: () => setAddOpen(false) },
          )
        }
      />

      <ConfirmDialog
        open={terminateTarget !== null}
        title="Уволить сотрудника?"
        description={terminateTarget ? `${terminateTarget.fullName} будет отмечен как уволенный с сегодняшней датой.` : undefined}
        confirmLabel="Уволить"
        danger
        onConfirm={() => terminateTarget && terminateMutation.mutate({ workerId: terminateTarget.id, terminationDate: new Date().toISOString().slice(0, 10) })}
        onClose={() => setTerminateTarget(null)}
      />
    </AppLayout>
  );
}

function AddMemberModal({
  open,
  onClose,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (request: { fullName: string; phone: string; birthDate: string; payRateType: PayRateType; payRate: number; hireDate: string; specialty?: string | null }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [payRateType, setPayRateType] = useState<PayRateType>(PayRateType.Hourly);
  const [payRate, setPayRate] = useState("");
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  function reset() {
    setFullName(""); setPhone(""); setBirthDate(""); setSpecialty(""); setPayRateType(PayRateType.Hourly); setPayRate(""); setHireDate(new Date().toISOString().slice(0, 10)); setError("");
  }
  function handleClose() { reset(); onClose(); }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim() || !phone.trim() || !birthDate || !hireDate) return setError("Заполните обязательные поля");
    const rate = Number(payRate);
    if (!Number.isFinite(rate) || rate < 0) return setError("Некорректная ставка");
    onSubmit({ fullName: fullName.trim(), phone: phone.trim(), birthDate, payRateType, payRate: rate, hireDate, specialty: specialty.trim() || null });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Добавить сотрудника в бригаду" size="md">
      <form className="users-modal-form" onSubmit={handleSubmit}>
        <label><span>ФИО</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label><span>Телефон</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 90 456 78 90" /></label>
        <label><span>Дата рождения</span><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label>
        <label><span>Специальность</span><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></label>
        <label>
          <span>Тип ставки</span>
          <CustomSelect fullWidth value={String(payRateType)} onValueChange={(v) => setPayRateType(Number(v) as PayRateType)} options={[{ value: String(PayRateType.Hourly), label: "Почасовая" }, { value: String(PayRateType.Piecework), label: "Сдельная" }]} />
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

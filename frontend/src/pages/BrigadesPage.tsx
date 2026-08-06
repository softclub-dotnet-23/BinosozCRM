import { useMemo, useState } from "react";
import { AlertCircle, Plus, UserCog, Users, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { Modal } from "../components/ui/Modal";
import { CustomSelect } from "../components/ui/CustomSelect";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { useBrigades, useCreateBrigade, useAssignBrigadir, useSetBrigadeActive } from "../hooks/api/useBrigades";
import { useWorkers } from "../hooks/api/useWorkers";
import { useUsers } from "../hooks/api/useUsers";
import { normalizeApiError } from "../services/apiError";
import { Role } from "../services/types";
import type { BrigadeDto } from "../services/brigadesApi";
import BrigadirTeamPage from "./BrigadirTeamPage";

export default function BrigadesPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirTeamPage />;
  return <CompanyBrigadesPage />;
}

function CompanyBrigadesPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<BrigadeDto | null>(null);

  const { data, isLoading, isError, error, refetch } = useBrigades({ page: 1, pageSize: 200 });
  const { data: workersData } = useWorkers({ page: 1, pageSize: 500 });
  const { data: usersData } = useUsers({ page: 1, pageSize: 200 });

  const createMutation = useCreateBrigade();
  const assignMutation = useAssignBrigadir();
  const setActiveMutation = useSetBrigadeActive();

  const brigades = data?.items ?? [];
  const workers = workersData?.items ?? [];
  const brigadirUsers = (usersData?.items ?? []).filter((u) => u.role === Role.Brigadir && u.isActive);
  const userName = (userId: string | null) => (userId ? (usersData?.items ?? []).find((u) => u.id === userId)?.fullName ?? "—" : "Не назначен");
  const memberCount = (brigadeId: string) => workers.filter((w) => w.brigadeId === brigadeId && w.isActive).length;

  const filteredBrigades = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? brigades.filter((b) => b.name.toLowerCase().includes(query)) : brigades;
  }, [brigades, search]);

  const kpis = useMemo(() => {
    const active = brigades.filter((b) => b.isActive).length;
    const withBrigadir = brigades.filter((b) => b.brigadirUserId).length;
    return { total: brigades.length, active, withBrigadir, totalMembers: workers.filter((w) => w.isActive).length };
  }, [brigades, workers]);

  const columns: DataTableColumn<BrigadeDto>[] = [
    { key: "name", header: "Бригада", sticky: "left", width: "220px", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    { key: "brigadir", header: "Бригадир", render: (row) => <span className="text-ink-secondary">{userName(row.brigadirUserId)}</span> },
    { key: "members", header: "Состав", render: (row) => <span className="tabular text-ink">{memberCount(row.id)}</span> },
    {
      key: "status",
      header: "Статус",
      render: (row) => <span className={`user-status ${row.isActive ? "active" : "inactive"}`}>{row.isActive ? "Активна" : "Приостановлена"}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "160px",
      sticky: "right",
      render: (row) => (
        <div className="flex items-center justify-end">
          <DropdownMenu
            trigger={<UserCog size={16} />}
            items={[
              { label: "Назначить бригадира", onClick: () => setAssignTarget(row) },
              {
                label: row.isActive ? "Приостановить" : "Активировать",
                onClick: () => setActiveMutation.mutate({ brigadeId: row.id, isActive: !row.isActive }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Бригады"
      subtitle="Состав и назначения бригад компании"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск по названию" }}
      action={<Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Новая бригада</Button>}
    >
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Всего бригад" value={String(kpis.total)} icon={Users} tone="orange" />
        <MetricCard label="Активных" value={String(kpis.active)} icon={UsersRound} tone="green" />
        <MetricCard label="С назначенным бригадиром" value={String(kpis.withBrigadir)} icon={UserCog} tone="blue" />
        <MetricCard label="Сотрудников в бригадах" value={String(kpis.totalMembers)} icon={Users} tone="purple" />
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)}</div>
        ) : isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Не удалось загрузить бригады"
            description={normalizeApiError(error).message}
            action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>}
          />
        ) : filteredBrigades.length === 0 ? (
          <EmptyState icon={Users} title="Бригад пока нет" description="Создайте первую бригаду" />
        ) : (
          <DataTable columns={columns} rows={filteredBrigades} rowKey={(row) => row.id} />
        )}
      </Card>

      <CreateBrigadeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        submitting={createMutation.isPending}
        onSubmit={(name) => createMutation.mutate({ name }, { onSuccess: () => { setCreateOpen(false); showToast("Бригада создана"); } })}
      />

      <AssignBrigadirModal
        brigade={assignTarget}
        candidates={brigadirUsers}
        submitting={assignMutation.isPending}
        onClose={() => setAssignTarget(null)}
        onSubmit={(userId) =>
          assignTarget &&
          assignMutation.mutate({ brigadeId: assignTarget.id, userId }, { onSuccess: () => setAssignTarget(null) })
        }
      />
    </AppLayout>
  );
}

function CreateBrigadeModal({ open, onClose, submitting, onSubmit }: { open: boolean; onClose: () => void; submitting: boolean; onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  function handleClose() { setName(""); onClose(); }
  return (
    <Modal open={open} onClose={handleClose} title="Новая бригада" size="sm">
      <form className="users-modal-form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }}>
        <label><span>Название</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Бригада №5" autoFocus /></label>
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting || !name.trim()}>{submitting ? "Создание..." : "Создать"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignBrigadirModal({
  brigade,
  candidates,
  submitting,
  onClose,
  onSubmit,
}: {
  brigade: BrigadeDto | null;
  candidates: { id: string; fullName: string }[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (userId: string | null) => void;
}) {
  const [userId, setUserId] = useState<string>(brigade?.brigadirUserId ?? "");
  return (
    <Modal open={brigade !== null} onClose={onClose} title="Назначить бригадира" description={brigade?.name} size="sm">
      {brigade && (
        <div className="users-modal-form">
          <label>
            <span>Бригадир</span>
            <CustomSelect
              fullWidth
              value={userId || brigade.brigadirUserId || ""}
              onValueChange={setUserId}
              placeholder="Выберите пользователя"
              options={[{ value: "", label: "Без бригадира" }, ...candidates.map((c) => ({ value: c.id, label: c.fullName }))]}
            />
          </label>
          {candidates.length === 0 && <p className="text-xs text-ink-muted">Нет пользователей с ролью «Бригадир» — создайте их на странице «Пользователи».</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
            <Button type="button" disabled={submitting} onClick={() => onSubmit(userId || null)}>{submitting ? "Сохранение..." : "Сохранить"}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

import { useState } from "react";
import { AlertCircle, Building2, Plus, UserRoundX, Users } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { CustomSelect } from "../components/ui/CustomSelect";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { useObjects, useObjectProrabs, useAssignProrab } from "../hooks/api/useObjects";
import { useUsers } from "../hooks/api/useUsers";
import { normalizeApiError } from "../services/apiError";
import { Role } from "../services/types";
import { formatDateShort } from "../utils/date";
import type { ProrabAssignmentDto } from "../services/objectsApi";

/**
 * MASTER §1.2/§9.4: ProrabObjectAssignment — which Prorab is assigned to which construction
 * object (Owner-only). No assignments for an object means every Prorab can see it (§1.2's
 * no-setup default); one assignment switches that object to a strict allow-list.
 */
export default function AssignmentsPage() {
  const [selectedObjectId, setSelectedObjectId] = useState<string>("");
  const [assignOpen, setAssignOpen] = useState(false);

  const { data: objectsData, isLoading: objectsLoading } = useObjects({ page: 1, pageSize: 200 });
  const objects = objectsData?.items ?? [];
  const activeObjectId = selectedObjectId || objects[0]?.id || "";

  const { data: usersData } = useUsers({ page: 1, pageSize: 200 });
  const prorabUsers = (usersData?.items ?? []).filter((u) => u.role === Role.Prorab && u.isActive);
  const userName = (userId: string) => (usersData?.items ?? []).find((u) => u.id === userId)?.fullName ?? userId;

  const { data, isLoading, isError, error, refetch } = useObjectProrabs(activeObjectId, { page: 1, pageSize: 100 });
  const assignMutation = useAssignProrab();

  const assignments = data?.items ?? [];

  const columns: DataTableColumn<ProrabAssignmentDto>[] = [
    {
      key: "prorab",
      header: "Прораб",
      sticky: "left",
      width: "220px",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={userName(row.prorabUserId)} size="sm" />
          <span className="font-semibold text-ink">{userName(row.prorabUserId)}</span>
        </div>
      ),
    },
    { key: "assignedAt", header: "Назначен", render: (row) => <span className="tabular text-ink-secondary">{formatDateShort(row.assignedAt)}</span> },
    { key: "assignedBy", header: "Кем назначен", render: (row) => <span className="text-ink-secondary">{userName(row.assignedByUserId)}</span> },
  ];

  return (
    <AppLayout title="Назначения прорабов" subtitle="Какие прорабы закреплены за объектами">
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <CustomSelect
          size="sm"
          value={activeObjectId}
          onValueChange={setSelectedObjectId}
          placeholder="Выберите объект"
          options={objects.map((o) => ({ value: o.id, label: o.name }))}
        />
        <Button className="ml-auto" onClick={() => setAssignOpen(true)} disabled={!activeObjectId}><Plus size={15} /> Назначить прораба</Button>
      </Card>

      {!objectsLoading && objects.length === 0 ? (
        <EmptyState icon={Building2} title="Объектов пока нет" description="Создайте объект на странице «Объекты»" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Объектов всего" value={String(objects.length)} icon={Building2} tone="blue" />
            <MetricCard label="Прорабов на объекте" value={String(assignments.length)} icon={Users} tone="green" />
            <MetricCard label="Свободных прорабов" value={String(prorabUsers.filter((p) => !assignments.some((a) => a.prorabUserId === p.id)).length)} icon={UserRoundX} tone="orange" />
          </div>

          <Card>
            {isLoading ? (
              <div className="p-4">{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}</div>
            ) : isError ? (
              <EmptyState icon={AlertCircle} title="Не удалось загрузить назначения" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
            ) : assignments.length === 0 ? (
              <EmptyState icon={Users} title="Прорабы не назначены" description="Пока каждый прораб видит этот объект — назначение переводит объект в режим строгого списка доступа" />
            ) : (
              <DataTable columns={columns} rows={assignments} rowKey={(row) => row.id} />
            )}
          </Card>
        </>
      )}

      <AssignProrabModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        candidates={prorabUsers.filter((p) => !assignments.some((a) => a.prorabUserId === p.id))}
        submitting={assignMutation.isPending}
        onSubmit={(prorabUserId) =>
          assignMutation.mutate({ objectId: activeObjectId, prorabUserId }, { onSuccess: () => setAssignOpen(false) })
        }
      />
    </AppLayout>
  );
}

function AssignProrabModal({
  open,
  onClose,
  candidates,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  candidates: { id: string; fullName: string }[];
  submitting: boolean;
  onSubmit: (prorabUserId: string) => void;
}) {
  const [userId, setUserId] = useState("");
  function handleClose() { setUserId(""); onClose(); }
  return (
    <Modal open={open} onClose={handleClose} title="Назначить прораба на объект" size="sm">
      <div className="users-modal-form">
        {candidates.length === 0 ? (
          <p className="text-sm text-ink-secondary">Все прорабы уже назначены на этот объект (или их нет — создайте на странице «Пользователи»).</p>
        ) : (
          <label>
            <span>Прораб</span>
            <CustomSelect fullWidth value={userId} onValueChange={setUserId} placeholder="Выберите прораба" options={candidates.map((c) => ({ value: c.id, label: c.fullName }))} />
          </label>
        )}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="button" disabled={submitting || !userId} onClick={() => onSubmit(userId)}>{submitting ? "Назначение..." : "Назначить"}</Button>
        </div>
      </div>
    </Modal>
  );
}

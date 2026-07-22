import { useState } from "react";
import { BarChart3, CalendarDays, Clock3, Plus, UserRound, UserRoundX } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { MetricCard } from "../components/ui/MetricCard";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Avatar } from "../components/ui/Avatar";
import { AttendanceStatusBadge } from "../components/attendance/AttendanceStatusBadge";
import { AttendanceFormModal } from "../components/attendance/AttendanceFormModal";
import { AttendanceDetailDrawer } from "../components/attendance/AttendanceDetailDrawer";
import { brigadesRepository, employeesRepository, attendanceRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { findBrigadirScope } from "../utils/brigadeAccess";
import { computeAttendanceKpis, computeFrequentLateness } from "../utils/attendanceAnalytics";
import { resolvePersonPhoto } from "../utils/personPhotos";
import { formatDateShort } from "../utils/date";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import type { AttendanceRecord, AttendanceStatus } from "../types";

type StatusFilter = "all" | AttendanceStatus;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "present", label: "Присутствуют" },
  { key: "late", label: "Опоздания" },
  { key: "absent", label: "Отсутствуют" },
];

export default function BrigadirAttendancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const employees = useRepositorySnapshot(employeesRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const [records, setRecords] = useRepositoryState(attendanceRepository);
  const [filter, setFilter] = usePersistentState<StatusFilter>("filters.brigadirAttendance.status", "all");
  const [formRecord, setFormRecord] = useState<AttendanceRecord | null | undefined>(undefined);
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null);

  const scope = user ? findBrigadirScope(employees, brigades, user.fullName) : null;

  if (!scope) {
    return (
      <AppLayout title="Посещаемость" subtitle="Учёт присутствия бригады, опозданий и отсутствий">
        <Card className="p-0">
          <ErrorState
            title="Бригада не найдена"
            description="Ваша учётная запись не привязана ни к одной бригаде. Обратитесь к администратору."
          />
        </Card>
      </AppLayout>
    );
  }

  const { brigade } = scope;
  const brigadeRecords = records.filter((r) => r.brigadeName === brigade.name);
  const kpis = computeAttendanceKpis(brigadeRecords);
  const frequentLateness = computeFrequentLateness(brigadeRecords);

  const filteredRecords = filter === "all" ? brigadeRecords : brigadeRecords.filter((r) => r.status === filter);

  function handleSave(record: AttendanceRecord) {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === record.id);
      return exists ? prev.map((r) => (r.id === record.id ? record : r)) : [record, ...prev];
    });
    setFormRecord(undefined);
    showToast(formRecord ? "Запись обновлена" : "Посещение отмечено");
  }

  return (
    <AppLayout title="Посещаемость" subtitle="Учёт присутствия бригады, опозданий и отсутствий">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Всего отметок" value={String(kpis.total)} icon={CalendarDays} tone="blue" footer={brigade.name} />
        <MetricCard label="Присутствовали" value={String(kpis.present)} icon={UserRound} tone="green" footer={`${kpis.presentPercent}% от отметок`} />
        <MetricCard label="Опоздания" value={String(kpis.late)} icon={Clock3} tone="orange" footer={`${kpis.latePercent}% от отметок`} />
        <MetricCard label="Отсутствия" value={String(kpis.absent)} icon={UserRoundX} tone="red" footer={`${kpis.absentPercent}% от отметок`} />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 2xl:grid-cols-[1.12fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex gap-2">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilter(t.key)}
                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold ${
                    filter === t.key ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-ink-secondary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setFormRecord(null)}>
              <Plus size={14} /> Отметить посещение
            </Button>
          </div>

          {filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[10px]">
                <thead>
                  <tr className="border-y border-border bg-[#fafaf9] text-ink-muted">
                    <th className="px-4 py-3">Сотрудник</th>
                    <th>Дата</th>
                    <th>Приход</th>
                    <th>Уход</th>
                    <th>Статус</th>
                    <th>Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id} onClick={() => setViewRecord(r)} className="cursor-pointer border-b border-border hover:bg-[#fffaf6]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {resolvePersonPhoto(r.employeeName) ? (
                            <img src={resolvePersonPhoto(r.employeeName)} alt={r.employeeName} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <Avatar name={r.employeeName} size="sm" />
                          )}
                          <b>{r.employeeName}</b>
                        </div>
                      </td>
                      <td>{formatDateShort(r.date)}</td>
                      <td>{r.arrivalTime ?? "—"}</td>
                      <td>{r.departureTime ?? "—"}</td>
                      <td><AttendanceStatusBadge status={r.status} /></td>
                      <td>{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={UserRoundX}
              title="Записей не найдено"
              description={filter === "all" ? "Для этой бригады пока нет отметок посещаемости" : "Нет записей с выбранным статусом"}
            />
          )}
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Сводка</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3"><div className="flex items-center gap-2"><UserRound size={16} className="text-green" /><span className="text-[9px] text-ink-secondary">Присутствуют</span></div><b className="mt-2 block text-xl">{kpis.present}</b></div>
              <div className="rounded-xl border border-border p-3"><div className="flex items-center gap-2"><Clock3 size={16} className="text-warning" /><span className="text-[9px] text-ink-secondary">Опоздали</span></div><b className="mt-2 block text-xl">{kpis.late}</b></div>
              <div className="rounded-xl border border-border p-3"><div className="flex items-center gap-2"><UserRoundX size={16} className="text-red" /><span className="text-[9px] text-ink-secondary">Отсутствуют</span></div><b className="mt-2 block text-xl">{kpis.absent}</b></div>
              <div className="rounded-xl border border-border p-3"><div className="flex items-center gap-2"><BarChart3 size={16} className="text-blue" /><span className="text-[9px] text-ink-secondary">Явка</span></div><b className="mt-2 block text-xl">{kpis.total > 0 ? `${kpis.presentPercent}%` : "—"}</b></div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Частые опоздания</h2>
            {frequentLateness.length > 0 ? (
              <ul className="mt-3.5 space-y-3">
                {frequentLateness.map((row) => (
                  <li key={row.employeeName} className="flex items-center gap-2.5">
                    <Avatar name={row.employeeName} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.employeeName}</span>
                    <span className="shrink-0 text-xs font-semibold text-ink-secondary">{row.count} раза</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 py-4 text-center text-sm text-ink-secondary">Опозданий не зафиксировано</p>
            )}
          </Card>
        </div>
      </div>

      <AttendanceFormModal open={formRecord !== undefined} record={formRecord ?? null} onClose={() => setFormRecord(undefined)} onSave={handleSave} />
      <AttendanceDetailDrawer record={viewRecord} onClose={() => setViewRecord(null)} />
    </AppLayout>
  );
}

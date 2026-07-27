import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, Phone, ShieldCheck, UserRoundX, Users } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { MetricCard } from "../components/ui/MetricCard";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";
import { Avatar } from "../components/ui/Avatar";
import { EmployeeStatusBadge } from "../components/brigades/EmployeeStatusBadge";
import { EmployeeRoleBadge } from "../components/brigades/EmployeeRoleBadge";
import { WorkStatusBadge } from "../components/works/WorkStatusBadge";
import { WorkProgressBar } from "../components/works/WorkProgressBar";
import { brigadesRepository, employeesRepository, worksRepository, attendanceRepository } from "../data/repositories";
import { useRepositorySnapshot } from "../hooks/useRepositoryState";
import { findBrigadirScope } from "../utils/brigadeAccess";
import { computeAttendanceKpis } from "../utils/attendanceAnalytics";
import { BRIGADE_STATUS_CONFIG } from "../utils/brigadeStatus";
import { resolvePersonPhoto } from "../utils/personPhotos";
import { useAuth } from "../context/AuthContext";

export default function BrigadirTeamPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const employees = useRepositorySnapshot(employeesRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const works = useRepositorySnapshot(worksRepository);
  const attendance = useRepositorySnapshot(attendanceRepository);

  const scope = user ? findBrigadirScope(employees, brigades, user.fullName) : null;

  if (!scope) {
    return (
      <AppLayout title="Моя бригада" subtitle="Состав бригады, роли, посещаемость и производительность">
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
  const crew = employees.filter((e) => e.brigadeId === brigade.id);
  const onSiteCrew = crew.filter((e) => e.status === "on_shift" || e.status === "on_site");
  const absentCrew = crew.filter((e) => e.status === "absent" || e.status === "sick_leave" || e.status === "on_leave");
  const brigadeAttendance = attendance.filter((a) => a.brigadeName === brigade.name);
  const attendanceKpis = computeAttendanceKpis(brigadeAttendance);

  const brigadeWorks = works.filter((w) => w.brigadeId === brigade.id);
  const upcomingWorks = brigadeWorks
    .filter((w) => w.status !== "completed" && w.status !== "cancelled")
    .sort((a, b) => (a.plannedStart < b.plannedStart ? -1 : 1))
    .slice(0, 5);

  const roleCounts = Array.from(
    crew.reduce((map, e) => map.set(e.specialty, (map.get(e.specialty) ?? 0) + 1), new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);

  const foreman = employees.find((e) => e.brigadeId === brigade.id && e.memberRole === "foreman");

  return (
    <AppLayout title="Моя бригада" subtitle="Состав бригады, роли, посещаемость и производительность">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Всего сотрудников" value={String(crew.length)} icon={Users} tone="blue" footer={brigade.name} />
        <MetricCard label="На объекте сейчас" value={String(onSiteCrew.length)} icon={CheckCircle2} tone="green" footer="На смене / на объекте" />
        <MetricCard label="Отсутствуют" value={String(absentCrew.length)} icon={UserRoundX} tone="orange" footer="Отпуск / больничный / неявка" />
        <MetricCard
          label="Посещаемость"
          value={attendanceKpis.total > 0 ? `${attendanceKpis.presentPercent}%` : "—"}
          icon={CheckCircle2}
          tone="green"
          footer={attendanceKpis.total > 0 ? `${attendanceKpis.total} отметок за период` : "Нет данных"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 2xl:grid-cols-[1.04fr_1fr]">
        <Card className="2xl:row-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-[15px] font-bold text-ink">Состав бригады ({crew.length})</h2>
          </div>
          {crew.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="bg-[#fafaf9] text-[10px] font-semibold text-ink-muted">
                    <th className="px-5 py-3">Сотрудник</th>
                    <th className="px-3 py-3">Специальность</th>
                    <th className="px-3 py-3">Статус</th>
                    <th className="px-4 py-3">Телефон</th>
                  </tr>
                </thead>
                <tbody>
                  {crew.map((m) => (
                    <tr key={m.id} className="border-t border-border hover:bg-[#fffaf6]">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {resolvePersonPhoto(m.fullName) ? (
                            <img src={resolvePersonPhoto(m.fullName)} alt={m.fullName} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <Avatar name={m.fullName} size="sm" />
                          )}
                          <span className="whitespace-nowrap text-[11px] font-semibold text-ink">
                            {m.fullName}
                            {m.memberRole === "foreman" && <span className="ml-1 font-normal text-ink-muted">(прораб)</span>}
                            {m.memberRole === "brigadir" && <span className="ml-1 font-normal text-ink-muted">(бригадир)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><EmployeeRoleBadge specialty={m.specialty} /></td>
                      <td className="px-3 py-2.5"><EmployeeStatusBadge status={m.status} /></td>
                      <td className="px-4 py-2.5 text-[10px] text-ink-secondary">{m.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Users} title="В бригаде пока нет сотрудников" />
          )}
          <button
            onClick={() => navigate("/employees")}
            className="flex w-full items-center justify-between border-t border-border px-5 py-3.5 text-xs font-bold text-blue hover:bg-blue-soft"
          >
            <span>Полный список сотрудников →</span>
          </button>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5"><h2 className="text-[15px] font-bold text-ink">Специальности в бригаде</h2></div>
          {roleCounts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {roleCounts.map(([specialty, count]) => (
                <div key={specialty} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <span className="flex-1 text-[11px] font-semibold text-ink">{specialty}</span>
                  <b className="rounded-lg border border-border px-2 py-1 text-sm">{count}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="Нет данных" />
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5"><h2 className="text-[15px] font-bold text-ink">Ближайшие работы бригады</h2></div>
          {upcomingWorks.length > 0 ? (
            <div className="divide-y divide-border px-4">
              {upcomingWorks.map((w) => (
                <div key={w.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-ink">{w.title}</p>
                    <p className="truncate text-[9px] text-ink-muted">{w.objectName}</p>
                    <WorkProgressBar progress={w.progress} status={w.status} className="mt-1.5 w-28" />
                  </div>
                  <div className="flex items-center gap-3">
                    <WorkStatusBadge status={w.status} />
                    <button onClick={() => navigate("/works")} className="rounded-lg border border-primary/50 px-4 py-1.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-white">
                      Открыть
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ClipboardCheck} title="Нет активных работ у бригады" />
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 2xl:grid-cols-[1.43fr_1fr]">
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Посещаемость за период</h2>
          {attendanceKpis.total > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3"><p className="text-[9px] text-ink-muted">Присутствовали</p><b className="text-lg text-green">{attendanceKpis.present}</b></div>
              <div className="rounded-xl border border-border p-3"><p className="text-[9px] text-ink-muted">Опоздания</p><b className="text-lg text-warning">{attendanceKpis.late}</b></div>
              <div className="rounded-xl border border-border p-3"><p className="text-[9px] text-ink-muted">Отсутствия</p><b className="text-lg text-red">{attendanceKpis.absent}</b></div>
            </div>
          ) : (
            <EmptyState icon={Users} title="Нет отметок посещаемости за период" />
          )}
          <button onClick={() => navigate("/attendance")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/60 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-white">
            Открыть посещаемость
          </button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="text-[15px] font-bold text-ink">Краткая информация</h2><ShieldCheck className="text-green" size={22} /></div>
          <div className="mt-3 divide-y divide-border">
            {[
              [Users, "Бригадир:", user?.fullName ?? "—"],
              [ShieldCheck, "Прораб:", brigade.foremanName],
              [ClipboardCheck, "Объект:", brigade.objectName],
              [CheckCircle2, "Статус бригады:", BRIGADE_STATUS_CONFIG[brigade.status].label],
            ].map(([Icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2 py-2 text-[11px]">
                <Icon size={15} className="text-ink-muted" />
                <span className="text-ink-secondary">{label as string}</span>
                <b className="ml-auto">{value as string}</b>
              </div>
            ))}
          </div>
          {foreman?.phone && (
            <a
              href={`tel:${foreman.phone.replace(/\s/g, "")}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/60 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"
            >
              <Phone size={16} /> Позвонить прорабу ({foreman.phone})
            </a>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

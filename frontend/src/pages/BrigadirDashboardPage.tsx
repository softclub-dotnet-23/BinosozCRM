import { useNavigate } from "react-router-dom";
import { AlertTriangle, Box, CheckCircle2, ClipboardCheck, Phone, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";
import { Avatar } from "../components/ui/Avatar";
import { EmployeeStatusBadge } from "../components/brigades/EmployeeStatusBadge";
import { WorkStatusBadge } from "../components/works/WorkStatusBadge";
import { WorkProgressBar } from "../components/works/WorkProgressBar";
import { WorkSummaryDonut, WorkSummaryLegend } from "../components/works/WorkSummaryDonut";
import { brigadesRepository, employeesRepository, worksRepository, attendanceRepository, materialsRepository } from "../data/repositories";
import { useRepositorySnapshot } from "../hooks/useRepositoryState";
import { findBrigadirScope } from "../utils/brigadeAccess";
import { computeAttendanceKpis } from "../utils/attendanceAnalytics";
import { computeWorkAnalytics } from "../utils/workAnalytics";
import { getCriticalMaterials } from "../utils/materialAnalytics";
import { resolvePersonPhoto } from "../utils/personPhotos";
import { BRIGADE_STATUS_CONFIG } from "../utils/brigadeStatus";
import { useAuth } from "../context/AuthContext";

export default function BrigadirDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const employees = useRepositorySnapshot(employeesRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const works = useRepositorySnapshot(worksRepository);
  const attendance = useRepositorySnapshot(attendanceRepository);
  const materials = useRepositorySnapshot(materialsRepository);

  const scope = user ? findBrigadirScope(employees, brigades, user.fullName) : null;

  if (!scope) {
    return (
      <AppLayout title="Панель бригадира" subtitle="Контроль бригады, посещаемости и выполнения работ">
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

  const brigadeWorks = works.filter((w) => w.brigadeId === brigade.id);
  const analytics = computeWorkAnalytics(brigadeWorks);
  const activeWorks = brigadeWorks
    .filter((w) => w.status !== "completed" && w.status !== "cancelled")
    .sort((a, b) => (a.plannedStart < b.plannedStart ? -1 : 1))
    .slice(0, 4);

  const brigadeAttendance = attendance.filter((a) => a.brigadeName === brigade.name);
  const attendanceKpis = computeAttendanceKpis(brigadeAttendance);

  const criticalMaterials = getCriticalMaterials(materials).slice(0, 3);
  const foreman = employees.find((e) => e.brigadeId === brigade.id && e.memberRole === "foreman");

  return (
    <AppLayout title="Панель бригадира" subtitle="Контроль бригады, посещаемости и выполнения работ">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Panel>
          <PanelBody
            label="Состав бригады"
            value={`${crew.length} человек`}
            note={`${onSiteCrew.length} на объекте · ${absentCrew.length} отсутствуют`}
            icon={Users}
            tone="blue"
          />
        </Panel>
        <Panel>
          <PanelBody
            label="Назначенные работы"
            value={String(analytics.total)}
            note={`${analytics.inProgress} в работе · ${analytics.overdue} просрочено`}
            icon={ClipboardCheck}
            tone="orange"
          />
        </Panel>
        <Panel>
          <PanelBody
            label="Посещаемость"
            value={attendanceKpis.total > 0 ? `${attendanceKpis.presentPercent}%` : "—"}
            note={attendanceKpis.total > 0 ? `${attendanceKpis.total} отметок за период` : "Нет данных"}
            icon={CheckCircle2}
            tone="green"
          />
        </Panel>
        <Panel>
          <PanelBody label="Эффективность бригады" value={`${brigade.efficiency}%`} note={`Статус: ${BRIGADE_STATUS_CONFIG[brigade.status].label}`} icon={TrendingUp} tone="purple" />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[.92fr_1.28fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[16px] font-bold text-ink">Моя бригада</h2>
            <button onClick={() => navigate("/brigades")} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
              Вся бригада →
            </button>
          </div>
          {crew.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="bg-[#fafaf9] text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3">Сотрудник</th>
                    <th className="px-3 py-3">Специальность</th>
                    <th className="px-3 py-3">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {crew.slice(0, 6).map((person) => (
                    <tr key={person.id} className="border-t border-border/80 transition hover:bg-[#fffaf6]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {resolvePersonPhoto(person.fullName) ? (
                            <img src={resolvePersonPhoto(person.fullName)} className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow" alt={person.fullName} />
                          ) : (
                            <Avatar name={person.fullName} size="sm" />
                          )}
                          <span className="text-[13px] font-semibold text-ink">{person.fullName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-secondary">{person.specialty}</td>
                      <td className="px-3 py-3"><EmployeeStatusBadge status={person.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Users} title="В бригаде пока нет сотрудников" />
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[16px] font-bold text-ink">Работы бригады</h2>
            <button onClick={() => navigate("/works")} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
              Все работы →
            </button>
          </div>
          {activeWorks.length > 0 ? (
            <div className="divide-y divide-border px-5">
              {activeWorks.map((work) => (
                <div key={work.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-ink">{work.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">{work.objectName}</p>
                    <WorkProgressBar progress={work.progress} status={work.status} className="mt-2" barClassName="w-24" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <WorkStatusBadge status={work.status} />
                    <button onClick={() => navigate("/works")} className="rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-white">
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

      <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1.38fr_.82fr]">
        <Card className="p-5">
          <h2 className="text-[16px] font-bold">Сводка по работам бригады</h2>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-center">
            <WorkSummaryDonut analytics={analytics} />
            <WorkSummaryLegend analytics={analytics} />
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <h2 className="text-[16px] font-bold">Критичные материалы</h2>
            {criticalMaterials.length > 0 ? (
              <div className="mt-3 divide-y divide-border">
                {criticalMaterials.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-soft text-red">
                      <Box size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold">{m.name}</p>
                      <p className="text-[10px] text-ink-muted">{m.warehouse}</p>
                    </div>
                    <AlertTriangle size={16} className="text-red" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 py-4 text-center text-sm text-ink-secondary">Критичных материалов нет</p>
            )}
            <button
              onClick={() => navigate("/inventory/materials")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[11px] font-bold text-white hover:bg-primary-hover"
            >
              Перейти к материалам
            </button>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold">Краткая сводка</h2>
              <ShieldCheck className="text-green" size={22} />
            </div>
            <div className="space-y-3">
              {[
                ["Объект", brigade.objectName],
                ["Прораб", brigade.foremanName],
                ["Текущая работа", brigade.currentWork],
                ["Осталось дней", String(brigade.remainingDays)],
              ].map(([a, b]) => (
                <div key={a} className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">{a}</span>
                  <span className="font-bold">{b}</span>
                </div>
              ))}
            </div>
            {foreman?.phone && (
              <a
                href={`tel:${foreman.phone.replace(/\s/g, "")}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/60 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"
              >
                <Phone size={15} /> Позвонить прорабу
              </a>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <Card className="p-5">{children}</Card>;
}

function PanelBody({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  tone: "blue" | "orange" | "green" | "purple";
}) {
  const toneClasses: Record<string, string> = {
    blue: "bg-blue-soft text-blue",
    orange: "bg-warning-soft text-warning",
    green: "bg-green-soft text-green",
    purple: "bg-purple-soft text-purple",
  };
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[13px] font-semibold text-ink-secondary">{label}</p>
        <p className="mt-3 text-[27px] font-extrabold tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-[12px] text-ink-muted">{note}</p>
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
        <Icon size={23} />
      </div>
    </div>
  );
}

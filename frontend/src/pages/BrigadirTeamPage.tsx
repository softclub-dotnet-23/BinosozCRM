import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { EmptyState } from "../components/ui/EmptyState";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { useMyBrigadeWorkers } from "../hooks/api/useWorkers";
import { normalizeApiError } from "../services/apiError";
import { AlertCircle, ClipboardCheck, HardHat, Package } from "lucide-react";
import {
  Card,
  CardHeader,
  CheckIcon,
  PersonAvatar,
  UsersIcon,
  KpiCard,
} from "../components/brigadir/shared";

const PAGE_SIZE = 100;

export default function BrigadirTeamPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error, refetch } = useMyBrigadeWorkers({ page: 1, pageSize: PAGE_SIZE });

  const workers = data?.items ?? [];
  const visibleTeam = useMemo(
    () => workers.filter((w) => `${w.fullName} ${w.specialty ?? ""} ${w.phone}`.toLowerCase().includes(search.toLowerCase())),
    [workers, search],
  );

  const specialties = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workers) {
      const key = w.specialty?.trim() || "Без специальности";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [workers]);

  return (
    <AppLayout title="Моя бригада" subtitle="Состав бригады и специальности" titleBelowHeader contentMaxWidth="1280px" search={{ value: search, onChange: setSearch, placeholder: "Поиск..." }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>section]:min-h-[80px]">
        <KpiCard label="Сотрудников в бригаде" value={String(workers.length)} note="" color="blue" icon={UsersIcon} />
        <KpiCard label="Специальностей" value={String(specialties.length)} note="" color="green" icon={CheckIcon} />
        <KpiCard label="Активных нарядов" value="—" note="см. «Мои наряды»" color="orange" icon={HardHat} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>Состав бригады</CardHeader>
          {isLoading ? (
            <div className="p-3">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
          ) : isError ? (
            <div className="p-4">
              <EmptyState icon={AlertCircle} title="Не удалось загрузить бригаду" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
            </div>
          ) : visibleTeam.length === 0 ? (
            <div className="p-4"><EmptyState icon={UsersIcon} title="Никого не найдено" description="Измените запрос поиска" /></div>
          ) : (
            <div className="table-scroll-x overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-semibold text-ink-muted">
                    <th className="whitespace-nowrap px-3 py-2.5">Сотрудник</th>
                    <th className="whitespace-nowrap px-1.5">Специальность</th>
                    <th className="whitespace-nowrap px-1.5">В бригаде с</th>
                    <th className="whitespace-nowrap px-3">Телефон</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTeam.map((w) => (
                    <tr key={w.id} className="border-t border-border hover:bg-orange-50/40">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <PersonAvatar name={w.fullName} size={24} />
                          <span className="whitespace-nowrap text-[11px] font-semibold">{w.fullName}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-1.5 text-[10px] text-ink-secondary">{w.specialty ?? "—"}</td>
                      <td className="whitespace-nowrap px-1.5 text-[10px] text-ink-secondary">{w.hireDate}</td>
                      <td className="whitespace-nowrap px-3 text-[10px] text-ink-secondary">{w.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={() => navigate("/brigades/composition")}
            className="flex w-full items-center justify-between border-t border-border px-5 py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"
          >
            <span>Управление составом</span>
            <span>→</span>
          </button>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="overflow-hidden">
            <CardHeader>Специальности в бригаде</CardHeader>
            {specialties.length === 0 ? (
              <p className="p-4 text-[11px] text-ink-muted">Нет данных</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                {specialties.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5" title={name}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <UsersIcon size={13} />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold">{name}</span>
                    <b className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md border border-border bg-white px-1 text-sm shadow-sm">{count}</b>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>Работа бригады</CardHeader>
            <div className="flex flex-col gap-2 p-3">
              <button
                onClick={() => navigate("/work-orders")}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-primary-soft"
              >
                <ClipboardCheck size={16} className="text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold">Наряды бригады</p>
                  <p className="text-[9.5px] text-ink-muted">Приёмка, статусы, отчёты о выполнении</p>
                </div>
                <span className="text-primary">→</span>
              </button>
              <button
                onClick={() => navigate("/material-requests")}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-primary-soft"
              >
                <Package size={16} className="text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold">Заявки на материалы</p>
                  <p className="text-[9.5px] text-ink-muted">Запросить материал для бригады</p>
                </div>
                <span className="text-primary">→</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

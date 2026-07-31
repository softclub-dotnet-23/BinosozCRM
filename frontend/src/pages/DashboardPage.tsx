import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Building2, ClipboardList, Info, Loader2, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { ApiError, NetworkError } from "../api/apiClient";
import { getDashboardWorkStatus, type DashboardWorkStatus } from "../api/dashboardApi";
import { listObjects } from "../api/objectsApi";
import { listBrigades } from "../api/brigadesApi";
import { listWorkOrders } from "../api/workOrdersApi";
import BrigadirDashboardPage from "./BrigadirDashboardPage";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirDashboardPage />;
  return <CompanyDashboardPage />;
}

function CompanyDashboardPage() {
  const [workStatus, setWorkStatus] = useState<DashboardWorkStatus | null>(null);
  const [objectCount, setObjectCount] = useState(0);
  const [brigadeCount, setBrigadeCount] = useState(0);
  const [workOrderCount, setWorkOrderCount] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  async function loadAll() {
    setLoadState("loading");
    try {
      const [status, objects, brigades, workOrders] = await Promise.all([
        getDashboardWorkStatus(),
        listObjects(1, 1),
        listBrigades(1, 1),
        listWorkOrders(1, 1),
      ]);
      setWorkStatus(status);
      setObjectCount(objects.totalCount);
      setBrigadeCount(brigades.totalCount);
      setWorkOrderCount(workOrders.totalCount);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить сводку"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const workOrderStatusTotal = useMemo(
    () => workStatus?.workOrderStatusCounts.reduce((sum, s) => sum + s.count, 0) ?? 0,
    [workStatus],
  );

  return (
    <AppLayout title="Обзор" subtitle="Сводка по компании">
      {loadState === "error" && (
        <Card style={{ padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void loadAll()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && workStatus && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Объектов" value={String(objectCount)} icon={Building2} tone="orange" footer="Всего в компании" />
            <MetricCard label="Бригад" value={String(brigadeCount)} icon={UsersRound} tone="blue" footer="Всего в компании" />
            <MetricCard label="Нарядов" value={String(workOrderCount)} icon={ClipboardList} tone="green" footer="Всего создано" />
            <MetricCard
              label="Просрочено"
              value={String(workStatus.overdueWorkOrderCount + workStatus.overdueIndividualTaskCount)}
              icon={AlertTriangle}
              tone="red"
              footer={`${workStatus.overdueWorkOrderCount} нарядов, ${workStatus.overdueIndividualTaskCount} задач`}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h2 className="text-[17px] font-bold text-ink">Наряды по статусам</h2>
              <div className="mt-4 flex flex-col gap-2">
                {workStatus.workOrderStatusCounts.length === 0 ? (
                  <p className="text-sm text-ink-muted">Нарядов пока нет</p>
                ) : (
                  workStatus.workOrderStatusCounts.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-ink-secondary">{entry.status}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5F5F4]">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${workOrderStatusTotal ? (entry.count / workOrderStatusTotal) * 100 : 0}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold text-ink">{entry.count}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-[17px] font-bold text-ink">Личные задачи по статусам</h2>
              <div className="mt-4 flex flex-col gap-2">
                {workStatus.individualTaskStatusCounts.length === 0 ? (
                  <p className="text-sm text-ink-muted">Задач пока нет</p>
                ) : (
                  workStatus.individualTaskStatusCounts.map((entry) => (
                    <div key={entry.status} className="flex items-center justify-between text-sm">
                      <span className="text-ink-secondary">{entry.status}</span>
                      <span className="font-semibold text-ink">{entry.count}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card style={{ marginTop: 16, padding: 16 }}>
            <div className="flex items-start gap-2 text-sm text-ink-secondary">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>Финансовая сводка (бюджет/факт по всем объектам) недоступна — на backend нет общего агрегата расходов по компании, только постатейная разбивка по одному объекту (см. страницу «Объекты»).</span>
            </div>
          </Card>
        </>
      )}
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Loader2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { MetricCard } from "../components/ui/MetricCard";
import { Button } from "../components/ui/Button";
import { getDashboardWorkStatus, type DashboardWorkStatus } from "../api/dashboardApi";
import { ApiError, NetworkError } from "../api/apiClient";

export default function BrigadirDashboardPage() {
  const [data, setData] = useState<DashboardWorkStatus | null>(null); const [error, setError] = useState("");
  async function load() { setError(""); try { setData(await getDashboardWorkStatus()); } catch (cause) { setError(cause instanceof NetworkError ? "Нет подключения к серверу" : cause instanceof ApiError ? cause.message : "Не удалось загрузить сводку"); } }
  useEffect(() => { void load(); }, []);
  const total = useMemo(() => data?.workOrderStatusCounts.reduce((sum, item) => sum + item.count, 0) ?? 0, [data]);
  return <AppLayout title="Панель бригадира" subtitle="Сводка только по вашей бригаде">{error ? <Card><p className="text-red">{error}</p><Button className="mt-3" size="sm" onClick={() => void load()}>Повторить</Button></Card> : !data ? <Card><Loader2 className="animate-spin" /></Card> : <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><MetricCard label="Мои наряды" value={String(total)} icon={ClipboardList} tone="orange" footer="По статусам" /><MetricCard label="Просрочено" value={String(data.overdueWorkOrderCount)} icon={AlertTriangle} tone="red" footer="Требуют внимания" /></div><Card className="mt-4 p-5"><h2 className="font-bold text-ink">Наряды по статусам</h2><div className="mt-3 space-y-2">{data.workOrderStatusCounts.length ? data.workOrderStatusCounts.map((item) => <div key={item.status} className="flex justify-between text-sm"><span>{item.status}</span><strong>{item.count}</strong></div>) : <p className="text-ink-muted">Назначенных нарядов пока нет</p>}</div></Card></>}</AppLayout>;
}
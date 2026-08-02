import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ClipboardCheck,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { MetricCard } from '../components/ui/MetricCard';
import {
  DataTable,
  type DataTableColumn,
} from '../components/tables/DataTable';
import { ApiError, NetworkError } from '../api/apiClient';
import { getMyBrigade, type Brigade } from '../api/brigadesApi';
import { listMyWorkOrders, type WorkOrder } from '../api/workOrdersApi';
import { listTimesheets, type Timesheet } from '../api/timesheetsApi';

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return 'Не удалось подключиться к серверу';
  if (error instanceof ApiError) {
    if (error.status === 401)
      return 'Сессия истекла. Войдите в систему заново.';
    if (error.status === 403) return 'У вас нет прав для этого действия.';
    if (error.code === 'WORKER_NOT_FOUND')
      return 'Ваша учётная запись не привязана ни к одной бригаде. Обратитесь к администратору.';
    return error.message || fallback;
  }
  return fallback;
}

export default function BrigadirDashboardPage() {
  const [brigade, setBrigade] = useState<Brigade | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loadState, setLoadState] = useState<
    'loading' | 'ready' | 'error' | 'unavailable'
  >('loading');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function load() {
      setLoadState('loading');
      try {
        const [ownBrigade, myOrdersResult, timesheetsResult] =
          await Promise.all([
            getMyBrigade(),
            listMyWorkOrders(1, 100),
            listTimesheets(1, 100),
          ]);
        setBrigade(ownBrigade);
        setWorkOrders(myOrdersResult.items);
        setTimesheets(timesheetsResult.items);
        setLoadState('ready');
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.code === 'WORKER_NOT_FOUND' || error.status === 404)
        ) {
          setLoadState('unavailable');
          return;
        }
        setLoadError(
          describeError(error, 'Не удалось загрузить панель бригадира'),
        );
        setLoadState('error');
      }
    }

    void load();
  }, []);

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const checkedInToday = timesheets.filter(
      (row) => row.date === today && row.checkInAt,
    ).length;
    return {
      workOrdersTotal: workOrders.length,
      onReview: workOrders.filter((order) => order.status === 'OnReview')
        .length,
      inProgress: workOrders.filter((order) => order.status === 'InProgress')
        .length,
      checkedInToday,
    };
  }, [timesheets, workOrders]);

  const recentOrders = useMemo(() => workOrders.slice(0, 5), [workOrders]);

  if (loadState === 'loading') {
    return (
      <AppLayout title="Панель бригадира" subtitle="Загрузка сводки">
        <Card className="p-6 text-sm text-ink-secondary">
          Загружаем данные…
        </Card>
      </AppLayout>
    );
  }

  if (loadState === 'unavailable') {
    return (
      <AppLayout title="Панель бригадира" subtitle="Нет доступа к данным">
        <EmptyState
          icon={LayoutDashboard}
          title="Бригада не назначена"
          description="Для просмотра сводки сначала привяжите вашу учётную запись к бригаде."
        />
      </AppLayout>
    );
  }

  if (loadState === 'error') {
    return (
      <AppLayout
        title="Панель бригадира"
        subtitle="Не удалось загрузить данные"
      >
        <ErrorState
          title="Не удалось загрузить сводку"
          description={loadError}
          icon={AlertCircle}
        />
      </AppLayout>
    );
  }

  const columns: DataTableColumn<WorkOrder>[] = [
    {
      key: 'code',
      header: 'Наряд',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.code}</div>
          <div className="text-xs text-ink-muted">{row.title}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => <span className="text-ink-secondary">{row.status}</span>,
    },
    {
      key: 'due',
      header: 'Срок',
      render: (row) => (
        <span className="text-ink-secondary">{row.dueDate ?? '—'}</span>
      ),
    },
  ];

  return (
    <AppLayout
      title="Панель бригадира"
      subtitle={brigade?.name ?? 'Сводка по бригаде'}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Бригада"
            value={brigade?.name ?? '—'}
            icon={Users}
            tone="blue"
          />
          <MetricCard
            label="Всего нарядов"
            value={String(metrics.workOrdersTotal)}
            icon={ClipboardCheck}
            tone="orange"
          />
          <MetricCard
            label="В работе"
            value={String(metrics.inProgress)}
            icon={ClipboardCheck}
            tone="green"
          />
          <MetricCard
            label="На проверке"
            value={String(metrics.onReview)}
            icon={ClipboardCheck}
            tone="purple"
          />
        </div>

        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-ink">
                Сегодня в бригаде
              </h3>
              <p className="text-sm text-ink-secondary">
                Отмечено присутствующих сотрудников сегодня:{' '}
                {metrics.checkedInToday}
              </p>
            </div>
          </div>
          <div className="px-4 py-4 text-sm text-ink-secondary">
            Если в течение дня были отмечены явки, они будут отражены здесь.
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-ink">
                Последние наряды
              </h3>
              <p className="text-sm text-ink-secondary">
                Краткая сводка по текущим заданиям бригады.
              </p>
            </div>
          </div>
          {recentOrders.length > 0 ? (
            <DataTable
              columns={columns}
              rows={recentOrders}
              rowKey={(row) => row.id}
            />
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Наряды не найдены"
              description="Пока нет назначенных вам работ."
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

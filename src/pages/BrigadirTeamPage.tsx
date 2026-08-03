import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
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
import { listBrigadeWorkers, type Worker } from '../api/workersApi';

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

export default function BrigadirTeamPage() {
  const [brigade, setBrigade] = useState<Brigade | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadState, setLoadState] = useState<
    'loading' | 'ready' | 'error' | 'unavailable'
  >('loading');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function load() {
      setLoadState('loading');
      try {
        const ownBrigade = await getMyBrigade();
        const result = await listBrigadeWorkers(ownBrigade.id, 1, 100, false);
        setBrigade(ownBrigade);
        setWorkers(result.items);
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
          describeError(error, 'Не удалось загрузить состав бригады'),
        );
        setLoadState('error');
      }
    }

    void load();
  }, []);

  const activeWorkers = useMemo(
    () => workers.filter((worker) => worker.isActive),
    [workers],
  );

  if (loadState === 'loading') {
    return (
      <AppLayout title="Моя бригада" subtitle="Загрузка состава бригады">
        <Card className="p-6 text-sm text-ink-secondary">
          Загружаем данные…
        </Card>
      </AppLayout>
    );
  }

  if (loadState === 'unavailable') {
    return (
      <AppLayout title="Моя бригада" subtitle="Нет доступа к бригаде">
        <EmptyState
          icon={Users}
          title="Бригада не назначена"
          description="Ваша учётная запись пока не привязана к бригаде. Обратитесь к администратору."
        />
      </AppLayout>
    );
  }

  if (loadState === 'error') {
    return (
      <AppLayout title="Моя бригада" subtitle="Не удалось загрузить данные">
        <ErrorState
          title="Не удалось загрузить состав бригады"
          description={loadError}
          icon={AlertCircle}
        />
      </AppLayout>
    );
  }

  const columns: DataTableColumn<Worker>[] = [
    {
      key: 'name',
      header: 'Сотрудник',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.fullName}</div>
          <div className="text-xs text-ink-muted">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'specialty',
      header: 'Специальность',
      render: (row) => (
        <span className="text-ink-secondary">{row.specialty ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => (
        <span className={row.isActive ? 'text-green-700' : 'text-ink-muted'}>
          {row.isActive ? 'Активен' : 'Не активен'}
        </span>
      ),
    },
    {
      key: 'shift',
      header: 'Смена',
      render: (row) => (
        <span className="text-ink-secondary">{row.shiftStartTime ?? '—'}</span>
      ),
    },
  ];

  return (
    <AppLayout title="Моя бригада" subtitle={brigade?.name ?? 'Состав бригады'}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Бригада"
            value={brigade?.name ?? '—'}
            icon={Users}
            tone="blue"
          />
          <MetricCard
            label="Активных сотрудников"
            value={String(activeWorkers.length)}
            icon={Users}
            tone="green"
          />
          <MetricCard
            label="Всего в составе"
            value={String(workers.length)}
            icon={Users}
            tone="orange"
          />
        </div>

        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-ink">
                Состав бригады
              </h3>
              <p className="text-sm text-ink-secondary">
                Список сотрудников, доступных бригадиру по его собственной
                бригаде.
              </p>
            </div>
          </div>
          {workers.length > 0 ? (
            <DataTable
              columns={columns}
              rows={workers}
              rowKey={(row) => row.id}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Сотрудники не найдены"
              description="В этой бригаде пока нет активных сотрудников."
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

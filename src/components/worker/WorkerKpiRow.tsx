import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, ClipboardList } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import type { IndividualTask } from '../../api/individualTasksApi';
import type { WorkOrderProgress } from '../../api/workOrdersApi';

interface WorkerKpiRowProps {
  tasks: IndividualTask[];
  progressReports: WorkOrderProgress[];
}

// Three values, all computed from already-fetched real data — no separate
// requests per card, no invented totals. Today's attendance status lives on
// ShiftStatusCard instead of a fourth KPI here, since it's already shown
// there. "Выполнено" is div-by-zero guarded (0% with no applicable tasks).
export function WorkerKpiRow({ tasks, progressReports }: WorkerKpiRowProps) {
  const navigate = useNavigate();

  const total = tasks.length;
  const active = tasks.filter((t) => t.status !== 'Done').length;
  const done = tasks.filter((t) => t.status === 'Done').length;
  const donePercent = total > 0 ? Math.round((done / total) * 100) : 0;

  const latestReport = progressReports[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ClickableMetric onClick={() => navigate('/tasks')}>
        <MetricCard label="Задачи" value={String(total)} icon={ClipboardList} tone="blue" footer={`${active} активных`} />
      </ClickableMetric>
      <ClickableMetric onClick={() => navigate('/tasks')}>
        <MetricCard label="Выполнено" value={String(done)} icon={CheckCircle2} tone="green" progress={donePercent} progressLabel={`${donePercent}% за всё время`} />
      </ClickableMetric>
      <ClickableMetric onClick={() => navigate('/photo-reports')}>
        <MetricCard
          label="Фотоотчёты"
          value={String(progressReports.length)}
          icon={Camera}
          tone="purple"
          footer={latestReport ? `Последний в ${new Date(latestReport.reportedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Пока нет отчётов'}
        />
      </ClickableMetric>
    </div>
  );
}

function ClickableMetric({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="w-full text-left" onClick={onClick}>
      {children}
    </button>
  );
}

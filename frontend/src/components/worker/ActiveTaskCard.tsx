import { Camera, ClipboardCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import type { IndividualTask, IndividualTaskStatus } from '../../api/individualTasksApi';

const STATUS_LABEL: Record<IndividualTaskStatus, string> = {
  Assigned: 'Назначена',
  InProgress: 'В работе',
  Done: 'Выполнена',
};
const STATUS_TONE: Record<IndividualTaskStatus, 'blue' | 'orange' | 'green'> = {
  Assigned: 'blue',
  InProgress: 'orange',
  Done: 'green',
};

interface ActiveTaskCardProps {
  task: IndividualTask | null;
  brigadeName: string | null;
  busy: boolean;
  onStart: (task: IndividualTask) => void;
  onComplete: (task: IndividualTask) => void;
  onAddPhoto: (workOrderId: string) => void;
}

// Real fields only (Code/Title/Status/DueAt/BrigadeId — IndividualTask has
// no Priority/Floor/Zone/checklist/ProgressPercent anywhere in the domain,
// confirmed by grepping Domain/Entities). "Добавить фото" only renders when
// the task has a WorkOrderId — progress reports are WorkOrder-scoped in
// this domain, so a task without one has nothing to attach a photo to.
export function ActiveTaskCard({ task, brigadeName, busy, onStart, onComplete, onAddPhoto }: ActiveTaskCardProps) {
  if (!task) {
    return (
      <Card className="p-0">
        <div className="px-5 pt-5 sm:px-6"><h2 className="text-[17px] font-bold text-ink">Активная задача</h2></div>
        <EmptyState icon={ClipboardCheck} title="На сегодня активных задач нет" description="Новые задачи появятся здесь, когда их назначат" />
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Активная задача</p>
          <h3 className="mt-1 text-lg font-bold text-ink">{task.title}</h3>
        </div>
        <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary">
        <span>{task.code}</span>
        {task.dueAt && <span>До {new Date(task.dueAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
        {brigadeName && <span>Бригада «{brigadeName}»</span>}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {task.status === 'Assigned' && <Button disabled={busy} onClick={() => onStart(task)}>Начать работу</Button>}
        {task.status === 'InProgress' && <Button disabled={busy} onClick={() => onComplete(task)}>Завершить</Button>}
        {task.status === 'InProgress' && task.workOrderId && (
          <Button variant="secondary" onClick={() => onAddPhoto(task.workOrderId!)}><Camera size={15} /> Добавить фото</Button>
        )}
      </div>
    </Card>
  );
}

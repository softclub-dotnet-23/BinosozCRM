import { Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import type { IndividualTask } from '../../api/individualTasksApi';

interface UpcomingTimelineProps {
  tasks: IndividualTask[];
}

// Real task DueAt values only, future ones, chronological. No invented
// "Проверка бригадиром"/inspection entries — the domain has no Schedule/
// Inspection entity to back one (Worker-dashboard checkpoint decision,
// docs/PROGRESS.md).
export function UpcomingTimeline({ tasks }: UpcomingTimelineProps) {
  const now = Date.now();
  const upcoming = tasks
    .filter((t) => t.status !== 'Done' && t.dueAt && new Date(t.dueAt).getTime() >= now)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 5);

  return (
    <Card className="p-0">
      <div className="px-5 pt-5 sm:px-6"><h2 className="text-[17px] font-bold text-ink">Ближайшее</h2></div>
      <div className="mt-3 px-5 pb-5 sm:px-6">
        {upcoming.length === 0 ? (
          <EmptyState icon={Clock} title="Ближайших сроков нет" description="Здесь появятся сроки ваших задач" />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((task) => (
              <li key={task.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <span className="font-semibold text-ink">
                    {new Date(task.dueAt!).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="ml-2 text-ink-secondary">{task.title}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

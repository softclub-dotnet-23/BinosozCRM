import { CircleAlert, CircleCheck, CircleDot } from "lucide-react";
import type { TaskUrgency, UpcomingTask } from "../../types";
import { Card } from "../ui/Card";
import { formatDateRu } from "../../utils/date";
import { cn } from "../../utils/cn";

const URGENCY_CONFIG: Record<TaskUrgency, { label: string; className: string; icon: typeof CircleAlert }> = {
  overdue: { label: "Просрочено", className: "bg-red-soft text-red", icon: CircleAlert },
  today: { label: "Сегодня", className: "bg-warning-soft text-warning", icon: CircleDot },
  planned: { label: "В планах", className: "bg-blue-soft text-blue", icon: CircleCheck },
};

export function TaskList({ tasks }: { tasks: UpcomingTask[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Ближайшие задачи</h2>
      <ul className="mt-3 space-y-1">
        {tasks.map((task) => {
          const config = URGENCY_CONFIG[task.urgency];
          const Icon = config.icon;
          return (
            <li key={task.id} className="flex items-start gap-3 rounded-lg px-1 py-2.5 hover:bg-[#FAFAF9]">
              <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", config.className)}>
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                <p className="text-xs text-ink-secondary">
                  {task.responsible} · {formatDateRu(task.date)}
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", config.className)}>
                {config.label}
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover">
        Все задачи по объекту →
      </button>
    </Card>
  );
}

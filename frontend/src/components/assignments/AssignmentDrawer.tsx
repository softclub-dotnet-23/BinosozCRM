import { useEffect, useState } from "react";
import { Building2, Calendar, CheckCircle2, Pencil, Trash2, Wallet, XCircle } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Badge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { ObjectImage } from "../ui/ObjectImage";
import { Avatar } from "../ui/Avatar";
import { IconSummaryRow } from "../ui/IconSummaryRow";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { ASSIGNMENT_STATUS_CONFIG } from "../../utils/financeStatus";
import type { Assignment } from "../../types";

interface AssignmentDrawerProps {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  onUpdateProgress: (id: string, progress: number) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
}

export function AssignmentDrawer({
  open,
  onClose,
  assignment,
  onUpdateProgress,
  onComplete,
  onCancel,
  onEdit,
  onDelete,
}: AssignmentDrawerProps) {
  const [progressInput, setProgressInput] = useState("0");

  useEffect(() => {
    if (assignment) setProgressInput(String(assignment.progress));
  }, [assignment]);

  if (!assignment) {
    return (
      <Drawer open={open} onClose={onClose} title="Назначение">
        {null}
      </Drawer>
    );
  }

  const statusConfig = ASSIGNMENT_STATUS_CONFIG[assignment.status];
  const isClosed = assignment.status === "completed" || assignment.status === "cancelled";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Назначение №${assignment.number}`}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={() => onEdit(assignment)}>
            <Pencil size={14} /> Редактировать
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => onDelete(assignment)}>
            <Trash2 size={14} /> Удалить
          </Button>
        </>
      }
    >
      <div className="-mx-6 -mt-5 h-40 w-auto overflow-hidden">
        <ObjectImage src={assignment.imageUrl} type={assignment.objectType} alt={assignment.objectName} />
      </div>

      <div className="mt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-secondary">Объект / Работа</p>
            <p className="text-base font-bold text-ink">{assignment.objectName}</p>
            <p className="text-sm text-ink-secondary">{assignment.workTitle}</p>
          </div>
          <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <Avatar name={assignment.foremanName} size="sm" />
          <div>
            <p className="text-xs text-ink-secondary">Прораб · {assignment.brigadeName}</p>
            <p className="text-sm font-semibold text-ink">{assignment.foremanName}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <IconSummaryRow
            icon={Calendar}
            label="Период работ"
            value={`${formatDateShort(assignment.periodStart)} – ${formatDateShort(assignment.periodEnd)}`}
          />
          <IconSummaryRow icon={Wallet} label="Сумма" value={formatCurrency(assignment.amount)} />
          <IconSummaryRow icon={Building2} label="Бригада" value={assignment.brigadeName} />
        </div>

        <div className="my-4 border-t border-border" />

        <div>
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>Прогресс выполнения</span>
            <span className="font-semibold text-ink">{assignment.progress}%</span>
          </div>
          <ProgressBar
            value={assignment.progress}
            tone={assignment.status === "overdue" ? "red" : assignment.status === "completed" ? "green" : "orange"}
            className="mt-2"
          />

          {!isClosed && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                className="w-20 rounded-[10px] border border-border-strong px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const value = Math.max(0, Math.min(100, Number(progressInput) || 0));
                  onUpdateProgress(assignment.id, value);
                }}
              >
                Обновить прогресс
              </Button>
            </div>
          )}
        </div>

        {!isClosed && (
          <div className="mt-5 flex flex-col gap-2.5">
            <Button onClick={() => onComplete(assignment.id)}>
              <CheckCircle2 size={14} /> Завершить назначение
            </Button>
            <Button variant="outline" onClick={() => onCancel(assignment.id)}>
              <XCircle size={14} /> Отменить назначение
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

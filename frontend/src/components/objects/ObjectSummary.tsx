import { useNavigate } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import type { ConstructionObject } from "../../types";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { StatusBadge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { ObjectImage } from "../ui/ObjectImage";
import { Avatar } from "../ui/Avatar";
import { formatCurrency } from "../../utils/format";
import { formatDateRu } from "../../utils/date";
import { getProgressTone } from "../../utils/progress";

export function ObjectSummary({ object }: { object: ConstructionObject }) {
  const navigate = useNavigate();
  const remaining = object.budget - object.spent;

  return (
    <Card className="overflow-hidden">
      <PageHeader title="Сводка по выбранному объекту" />
      <div className="h-40 w-full overflow-hidden">
        <ObjectImage src={object.imageUrl} type={object.objectType} alt={object.name} />
      </div>
      <div className="p-5">
        <h3 className="text-base font-bold text-ink">{object.name}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-secondary">
          <MapPin size={13} className="shrink-0" /> {object.address}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-secondary">
          <Avatar name={object.foreman} size="sm" className="h-4 w-4 text-[8px]" /> {object.foreman}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={object.status} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F4] px-2.5 py-1 text-xs font-medium text-ink-secondary">
            <CalendarDays size={12} /> Срок: {formatDateRu(object.deadline)}
          </span>
        </div>

        <dl className="mt-4 space-y-2.5 text-sm">
          <SummaryRow label="Дата начала" value={formatDateRu(object.startDate)} />
          <SummaryRow label="Крайний срок" value={formatDateRu(object.deadline)} />
          <SummaryRow label="Бюджет" value={formatCurrency(object.budget)} />
          <SummaryRow label="Потрачено" value={formatCurrency(object.spent)} />
          <SummaryRow label="Остаток бюджета" value={formatCurrency(remaining)} />
        </dl>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>Прогресс выполнения</span>
            <span className="font-semibold text-ink">{object.progress}%</span>
          </div>
          <ProgressBar value={object.progress} tone={getProgressTone(object.status, object.progress)} className="mt-2" />
        </div>

        <Button variant="secondary" className="mt-5 w-full" onClick={() => navigate(`/objects/${object.id}`)}>
          Открыть детальную страницу
        </Button>
      </div>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="font-semibold text-ink tabular">{value}</dd>
    </div>
  );
}

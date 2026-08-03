import { AlertTriangle, Camera, Package } from 'lucide-react';
import { Card } from '../ui/Card';

interface QuickActionsRowProps {
  onPhotoReport: () => void;
  onMaterialRequest: () => void;
  onIssueReport: () => void;
  photoReportDisabled?: boolean;
}

export function QuickActionsRow({ onPhotoReport, onMaterialRequest, onIssueReport, photoReportDisabled }: QuickActionsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <QuickActionTile icon={Camera} tone="blue" label="Фотоотчёт" onClick={onPhotoReport} disabled={photoReportDisabled} />
      <QuickActionTile icon={Package} tone="green" label="Запросить материал" onClick={onMaterialRequest} />
      <QuickActionTile icon={AlertTriangle} tone="red" label="Сообщить о проблеме" onClick={onIssueReport} />
    </div>
  );
}

function QuickActionTile({
  icon: Icon,
  tone,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Camera;
  tone: 'blue' | 'green' | 'red';
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClasses = {
    blue: 'bg-blue-soft text-blue',
    green: 'bg-green-soft text-green',
    red: 'bg-red-soft text-red',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Card className="flex items-center gap-3 p-4 text-left transition-shadow hover:shadow-(--shadow-card-hover)">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
          <Icon size={18} />
        </span>
        <span className="text-sm font-semibold text-ink">{label}</span>
      </Card>
    </button>
  );
}

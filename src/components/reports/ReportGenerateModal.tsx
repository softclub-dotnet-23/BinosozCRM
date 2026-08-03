import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";

export type ReportFormat = "csv" | "print";
export type ReportGrouping = "day" | "week" | "month" | "object" | "brigade" | "category";

const GROUPING_LABEL: Record<ReportGrouping, string> = {
  day: "По дням",
  week: "По неделям",
  month: "По месяцам",
  object: "По объектам",
  brigade: "По бригадам",
  category: "По категориям",
};

const FORMAT_LABEL: Record<ReportFormat, string> = {
  csv: "Excel / CSV",
  print: "Печать / PDF",
};

export interface ReportGenerateOptions {
  grouping: ReportGrouping;
  includeCharts: boolean;
  includeTable: boolean;
  includeSummary: boolean;
  format: ReportFormat;
  title: string;
  note: string;
}

interface PreviewRow {
  label: string;
  value: string;
}

interface ReportGenerateModalProps {
  open: boolean;
  reportLabel: string;
  periodLabel: string;
  hasData: boolean;
  preview: PreviewRow[];
  onClose: () => void;
  onGenerate: (options: ReportGenerateOptions) => void;
}

function emptyOptions(reportLabel: string, periodLabel: string): ReportGenerateOptions {
  return {
    grouping: "day",
    includeCharts: true,
    includeTable: true,
    includeSummary: true,
    format: "csv",
    title: `${reportLabel} — ${periodLabel}`,
    note: "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

export function ReportGenerateModal({ open, reportLabel, periodLabel, hasData, preview, onClose, onGenerate }: ReportGenerateModalProps) {
  const [options, setOptions] = useState<ReportGenerateOptions>(() => emptyOptions(reportLabel, periodLabel));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setOptions(emptyOptions(reportLabel, periodLabel));
      setGenerating(false);
      setError("");
    }
  }, [open, reportLabel, periodLabel]);

  function update<K extends keyof ReportGenerateOptions>(key: K, value: ReportGenerateOptions[K]) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (generating) return;
    if (!hasData) {
      setError("Нет данных за выбранный период и фильтры — измените параметры");
      return;
    }
    if (!options.title.trim()) {
      setError("Укажите название отчёта");
      return;
    }
    setGenerating(true);
    setError("");
    window.setTimeout(() => {
      onGenerate(options);
    }, 350);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Сформировать отчёт"
      description={`${reportLabel} · ${periodLabel}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={generating}>
            {generating ? "Формирование..." : "Сформировать"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink sm:col-span-2">
          Название отчёта
          <input type="text" value={options.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
        </label>

        <label className="block text-sm font-medium text-ink">
          Группировка
          <CustomSelect
            className="mt-1.5"
            value={options.grouping}
            onValueChange={(v) => update("grouping", v as ReportGrouping)}
            options={(Object.keys(GROUPING_LABEL) as ReportGrouping[]).map((g) => ({ value: g, label: GROUPING_LABEL[g] }))}
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Формат
          <CustomSelect
            className="mt-1.5"
            value={options.format}
            onValueChange={(v) => update("format", v as ReportFormat)}
            options={(Object.keys(FORMAT_LABEL) as ReportFormat[]).map((f) => ({ value: f, label: FORMAT_LABEL[f] }))}
          />
        </label>

        <label className="block text-sm font-medium text-ink sm:col-span-2">
          Примечание
          <input type="text" value={options.note} onChange={(e) => update("note", e.target.value)} className={inputClass} />
        </label>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={options.includeSummary} onChange={(e) => update("includeSummary", e.target.checked)} className="h-4 w-4 rounded border-border-strong text-primary" />
            Включить сводку
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={options.includeCharts} onChange={(e) => update("includeCharts", e.target.checked)} className="h-4 w-4 rounded border-border-strong text-primary" />
            Включить графики
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={options.includeTable} onChange={(e) => update("includeTable", e.target.checked)} className="h-4 w-4 rounded border-border-strong text-primary" />
            Включить таблицу
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] bg-[#F5F5F4] px-4 py-3 text-sm">
        <p className="mb-2 text-xs font-semibold text-ink-secondary">Предпросмотр по текущим фильтрам</p>
        {hasData ? (
          <dl className="space-y-1.5">
            {preview.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <dt className="text-ink-secondary">{row.label}</dt>
                <dd className="font-semibold tabular text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-ink-muted">Нет данных для отображения — измените период или фильтры</p>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </Modal>
  );
}

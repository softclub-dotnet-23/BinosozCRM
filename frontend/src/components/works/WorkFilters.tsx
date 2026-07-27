import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { mockBrigades } from "../../data/mockAssignments";
import { cn } from "../../utils/cn";
import type { WorkSectionKey, WorkStatus } from "../../types";

export interface WorkFiltersState {
  status: WorkStatus | "all";
  objectId: string;
  sectionId: WorkSectionKey | "all";
  responsible: string;
  brigadeId: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_WORK_FILTERS: WorkFiltersState = {
  status: "all",
  objectId: "all",
  sectionId: "all",
  responsible: "all",
  brigadeId: "all",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-30",
};

const dateInputClass =
  "rounded-[10px] border border-border-strong px-2.5 py-2 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

interface WorkFiltersCardProps {
  filters: WorkFiltersState;
  onChange: (filters: WorkFiltersState) => void;
  onApply: () => void;
  onReset: () => void;
}

export function WorkFiltersCard({ filters, onChange, onApply, onReset }: WorkFiltersCardProps) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Фильтры</h2>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-ink">Период</p>
          <div className="mt-1.5 space-y-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className={cn(dateInputClass, "w-full")}
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className={cn(dateInputClass, "w-full")}
            />
          </div>
        </div>

        <label className="block text-sm font-medium text-ink">
          Ответственный
          <CustomSelect
            searchable
            className="mt-1.5"
            value={filters.responsible}
            onValueChange={(v) => onChange({ ...filters, responsible: v })}
            options={[
              { value: "all", label: "Все ответственные" },
              ...mockBrigades.map((b) => ({ value: b.foremanName, label: b.foremanName })),
            ]}
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Бригада
          <CustomSelect
            searchable
            className="mt-1.5"
            value={filters.brigadeId}
            onValueChange={(v) => onChange({ ...filters, brigadeId: v })}
            options={[{ value: "all", label: "Все бригады" }, ...mockBrigades.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </label>
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <Button onClick={onApply} className="flex-1">
          Применить
        </Button>
        <Button variant="outline" onClick={onReset} className="flex-1">
          Сбросить
        </Button>
      </div>
    </Card>
  );
}

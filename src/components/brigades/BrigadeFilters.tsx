import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import { mockObjects } from "../../data/mockObjects";
import type { BrigadeStatus } from "../../types";

export interface BrigadeFiltersState {
  status: BrigadeStatus | "all";
  foremanName: string;
  objectId: string;
}

export const DEFAULT_BRIGADE_FILTERS: BrigadeFiltersState = {
  status: "all",
  foremanName: "all",
  objectId: "all",
};

const selectClass =
  "h-9 rounded-lg border border-border-strong bg-card px-2.5 text-xs font-medium text-ink focus:border-primary focus:outline-none";

interface BrigadeFiltersProps {
  filters: BrigadeFiltersState;
  onChange: (filters: BrigadeFiltersState) => void;
  onReset: () => void;
  foremanNames: string[];
}

const STATUS_OPTIONS: { value: BrigadeStatus; label: string }[] = [
  { value: "active", label: "Активна" },
  { value: "paused", label: "На паузе" },
  { value: "inactive", label: "Неактивна" },
  { value: "forming", label: "Формируется" },
  { value: "overloaded", label: "Перегружена" },
];

export function BrigadeFilters({ filters, onChange, onReset, foremanNames }: BrigadeFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as BrigadeStatus | "all" })}
        className={selectClass}
      >
        <option value="all">Статус: Все</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={filters.foremanName}
        onChange={(e) => onChange({ ...filters, foremanName: e.target.value })}
        className={selectClass}
      >
        <option value="all">Прораб: Все</option>
        {foremanNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={filters.objectId}
        onChange={(e) => onChange({ ...filters, objectId: e.target.value })}
        className={selectClass}
      >
        <option value="all">Объект: Все</option>
        {mockObjects.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>

      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={13} /> Сбросить фильтры
      </Button>
    </div>
  );
}

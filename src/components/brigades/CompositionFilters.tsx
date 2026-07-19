import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import { mockObjects } from "../../data/mockObjects";
import { mockBrigades } from "../../data/mockBrigades";
import type { EmployeeStatus } from "../../types";

export interface CompositionFiltersState {
  brigadeId: string;
  specialty: string;
  objectId: string;
  status: EmployeeStatus | "all";
}

export const DEFAULT_COMPOSITION_FILTERS: CompositionFiltersState = {
  brigadeId: "all",
  specialty: "all",
  objectId: "all",
  status: "all",
};

const selectClass =
  "h-9 rounded-lg border border-border-strong bg-card px-2.5 text-xs font-medium text-ink focus:border-primary focus:outline-none";

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: "on_shift", label: "На смене" },
  { value: "on_site", label: "На объекте" },
  { value: "available", label: "Свободен" },
  { value: "on_trip", label: "На выезде" },
  { value: "absent", label: "Отсутствует" },
  { value: "on_leave", label: "В отпуске" },
  { value: "sick_leave", label: "На больничном" },
];

interface CompositionFiltersProps {
  filters: CompositionFiltersState;
  onChange: (filters: CompositionFiltersState) => void;
  onReset: () => void;
  specialties: string[];
}

export function CompositionFilters({ filters, onChange, onReset, specialties }: CompositionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.brigadeId}
        onChange={(e) => onChange({ ...filters, brigadeId: e.target.value })}
        className={selectClass}
      >
        <option value="all">Бригада: Все</option>
        {mockBrigades.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <select
        value={filters.specialty}
        onChange={(e) => onChange({ ...filters, specialty: e.target.value })}
        className={selectClass}
      >
        <option value="all">Роль: Все</option>
        {specialties.map((s) => (
          <option key={s} value={s}>
            {s}
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

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as EmployeeStatus | "all" })}
        className={selectClass}
      >
        <option value="all">Статус: Все</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={13} /> Сбросить фильтры
      </Button>
    </div>
  );
}

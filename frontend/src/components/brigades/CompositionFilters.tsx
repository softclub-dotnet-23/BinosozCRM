import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
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
      <CustomSelect
        size="sm"
        searchable
        aria-label="Бригада"
        value={filters.brigadeId}
        onValueChange={(v) => onChange({ ...filters, brigadeId: v })}
        options={[{ value: "all", label: "Бригада: Все" }, ...mockBrigades.map((b) => ({ value: b.id, label: b.name }))]}
      />

      <CustomSelect
        size="sm"
        searchable
        aria-label="Роль"
        value={filters.specialty}
        onValueChange={(v) => onChange({ ...filters, specialty: v })}
        options={[{ value: "all", label: "Роль: Все" }, ...specialties.map((s) => ({ value: s, label: s }))]}
      />

      <CustomSelect
        size="sm"
        searchable
        aria-label="Объект"
        value={filters.objectId}
        onValueChange={(v) => onChange({ ...filters, objectId: v })}
        options={[{ value: "all", label: "Объект: Все" }, ...mockObjects.map((o) => ({ value: o.id, label: o.name }))]}
      />

      <CustomSelect
        size="sm"
        aria-label="Статус"
        value={filters.status}
        onValueChange={(v) => onChange({ ...filters, status: v as EmployeeStatus | "all" })}
        options={[{ value: "all", label: "Статус: Все" }, ...STATUS_OPTIONS]}
      />

      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={13} /> Сбросить фильтры
      </Button>
    </div>
  );
}

import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
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
      <CustomSelect
        size="sm"
        aria-label="Статус"
        value={filters.status}
        onValueChange={(v) => onChange({ ...filters, status: v as BrigadeStatus | "all" })}
        options={[{ value: "all", label: "Статус: Все" }, ...STATUS_OPTIONS]}
      />

      <CustomSelect
        size="sm"
        aria-label="Прораб"
        value={filters.foremanName}
        onValueChange={(v) => onChange({ ...filters, foremanName: v })}
        options={[{ value: "all", label: "Прораб: Все" }, ...foremanNames.map((name) => ({ value: name, label: name }))]}
      />

      <CustomSelect
        size="sm"
        searchable
        aria-label="Объект"
        value={filters.objectId}
        onValueChange={(v) => onChange({ ...filters, objectId: v })}
        options={[
          { value: "all", label: "Объект: Все" },
          ...mockObjects.map((o) => ({ value: o.id, label: o.name })),
        ]}
      />

      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={13} /> Сбросить фильтры
      </Button>
    </div>
  );
}

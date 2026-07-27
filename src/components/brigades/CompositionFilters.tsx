import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { mockObjects } from "../../data/mockObjects";
import { mockBrigades } from "../../data/mockBrigades";
import { EMPLOYEE_STATUS_CONFIG, employeeStatusLabel } from "../../utils/brigadeStatus";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
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

function buildStatusOptions(s: AppStrings["brigades"]): { value: EmployeeStatus; label: string }[] {
  return (Object.keys(EMPLOYEE_STATUS_CONFIG) as EmployeeStatus[]).map((value) => ({ value, label: employeeStatusLabel(s, value) }));
}

interface CompositionFiltersProps {
  filters: CompositionFiltersState;
  onChange: (filters: CompositionFiltersState) => void;
  onReset: () => void;
  specialties: string[];
}

export function CompositionFilters({ filters, onChange, onReset, specialties }: CompositionFiltersProps) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;
  const a = strings.assignments;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CustomSelect
        size="sm"
        searchable
        aria-label={c.colBrigade}
        value={filters.brigadeId}
        onValueChange={(v) => onChange({ ...filters, brigadeId: v })}
        options={[{ value: "all", label: a.brigadeAllLabel }, ...mockBrigades.map((b) => ({ value: b.id, label: b.name }))]}
      />

      <CustomSelect
        size="sm"
        searchable
        aria-label={s.roleFilterAriaLabel}
        value={filters.specialty}
        onValueChange={(v) => onChange({ ...filters, specialty: v })}
        options={[{ value: "all", label: s.roleAllLabel }, ...specialties.map((specialty) => ({ value: specialty, label: specialty }))]}
      />

      <CustomSelect
        size="sm"
        searchable
        aria-label={c.colObject}
        value={filters.objectId}
        onValueChange={(v) => onChange({ ...filters, objectId: v })}
        options={[{ value: "all", label: a.objectAllLabel }, ...mockObjects.map((o) => ({ value: o.id, label: o.name }))]}
      />

      <CustomSelect
        size="sm"
        aria-label={c.colStatus}
        value={filters.status}
        onValueChange={(v) => onChange({ ...filters, status: v as EmployeeStatus | "all" })}
        options={[{ value: "all", label: a.statusAllLabel }, ...buildStatusOptions(s)]}
      />

      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={13} /> {c.resetFiltersButton}
      </Button>
    </div>
  );
}

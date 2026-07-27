import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { mockObjects } from "../../data/mockObjects";
import { BRIGADE_STATUS_CONFIG, brigadeStatusLabel } from "../../utils/brigadeStatus";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
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

function buildStatusOptions(s: AppStrings["brigades"]): { value: BrigadeStatus; label: string }[] {
  return (Object.keys(BRIGADE_STATUS_CONFIG) as BrigadeStatus[]).map((value) => ({ value, label: brigadeStatusLabel(s, value) }));
}

export function BrigadeFilters({ filters, onChange, onReset, foremanNames }: BrigadeFiltersProps) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;
  const a = strings.assignments;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CustomSelect
        size="sm"
        aria-label={c.colStatus}
        value={filters.status}
        onValueChange={(v) => onChange({ ...filters, status: v as BrigadeStatus | "all" })}
        options={[{ value: "all", label: a.statusAllLabel }, ...buildStatusOptions(s)]}
      />

      <CustomSelect
        size="sm"
        aria-label={c.roleLabels.prorab}
        value={filters.foremanName}
        onValueChange={(v) => onChange({ ...filters, foremanName: v })}
        options={[{ value: "all", label: a.foremanAllLabel }, ...foremanNames.map((name) => ({ value: name, label: name }))]}
      />

      <CustomSelect
        size="sm"
        searchable
        aria-label={c.colObject}
        value={filters.objectId}
        onValueChange={(v) => onChange({ ...filters, objectId: v })}
        options={[
          { value: "all", label: a.objectAllLabel },
          ...mockObjects.map((o) => ({ value: o.id, label: o.name })),
        ]}
      />

      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={13} /> {c.resetFiltersButton}
      </Button>
    </div>
  );
}

import { RotateCcw } from "lucide-react";
import { SearchInput } from "../../ui/SearchInput";
import { CustomSelect } from "../../ui/CustomSelect";
import { useLanguage } from "../../../context/LanguageContext";

export interface WorkerMaterialsFiltersState {
  search: string;
  category: string;
  unit: string;
  availableOnly: boolean;
}

export const DEFAULT_MATERIALS_FILTERS: WorkerMaterialsFiltersState = {
  search: "",
  category: "",
  unit: "",
  availableOnly: false,
};

interface WorkerMaterialsFiltersProps {
  value: WorkerMaterialsFiltersState;
  onChange: (value: WorkerMaterialsFiltersState) => void;
  categories: string[];
  units: string[];
}

export function WorkerMaterialsFilters({ value, onChange, categories, units }: WorkerMaterialsFiltersProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const categoryOptions = [{ value: "", label: s.materialsAllCategories }, ...categories.map((c) => ({ value: c, label: c }))];
  const unitOptions = [{ value: "", label: s.materialsUnitFilterPlaceholder }, ...units.map((u) => ({ value: u, label: u }))];
  const availabilityOptions = [
    { value: "available", label: s.materialsAvailabilityFilterLabel },
    { value: "all", label: s.materialsAllAvailability },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        containerClassName="min-w-[180px] flex-1"
        placeholder={s.materialsSearchPlaceholder}
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        aria-label={s.materialsSearchPlaceholder}
      />
      <CustomSelect
        className="w-36"
        value={value.category}
        onValueChange={(v) => onChange({ ...value, category: v })}
        options={categoryOptions}
        placeholder={s.materialsAllCategories}
        aria-label={s.materialsColCategory}
      />
      <CustomSelect
        className="w-28"
        value={value.unit}
        onValueChange={(v) => onChange({ ...value, unit: v })}
        options={unitOptions}
        placeholder={s.materialsUnitFilterPlaceholder}
        aria-label={s.materialsColUnit}
      />
      <CustomSelect
        className="w-44"
        value={value.availableOnly ? "available" : "all"}
        onValueChange={(v) => onChange({ ...value, availableOnly: v === "available" })}
        options={availabilityOptions}
        aria-label={s.materialsAvailabilityFilterLabel}
      />
      <button
        type="button"
        onClick={() => onChange(DEFAULT_MATERIALS_FILTERS)}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3.5 text-sm text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <RotateCcw size={14} />
        {s.materialsResetFilters}
      </button>
    </div>
  );
}

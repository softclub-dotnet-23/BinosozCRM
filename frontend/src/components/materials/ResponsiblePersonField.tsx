import { Avatar } from "../ui/Avatar";
import { CustomSelect } from "../ui/CustomSelect";
import { findEmployeeByIdOrName } from "../../utils/responsiblePerson";
import type { Employee } from "../../types";

interface ResponsiblePersonSelectProps {
  employees: Employee[];
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

/**
 * Responsible-person picker backed by the shared employees repository (the same
 * roster used by Brigades/Staff), instead of a per-feature hardcoded/derived list.
 * If the current value doesn't resolve to any employee (an old free-text name from
 * before this was centralized), it's kept as a synthetic option so opening an
 * existing record for edit never silently discards its saved value.
 */
export function ResponsiblePersonSelect({ employees, value, onChange, error }: ResponsiblePersonSelectProps) {
  const resolved = findEmployeeByIdOrName(value, employees);
  const isUnresolvedLegacy = Boolean(value) && !resolved;
  const selectValue = resolved ? resolved.id : value;
  const previewName = resolved?.fullName ?? (isUnresolvedLegacy ? value : null);

  return (
    <div>
      <CustomSelect
        searchable
        error={error}
        value={selectValue}
        onValueChange={onChange}
        className="mt-1.5"
        placeholder="Выберите сотрудника"
        options={[
          ...(isUnresolvedLegacy ? [{ value, label: value }] : []),
          ...employees.map((employee) => ({
            value: employee.id,
            label: employee.fullName,
            description: employee.specialty,
            icon: <Avatar name={employee.fullName} size="sm" />,
          })),
        ]}
      />
      {previewName && (
        <div className="mt-1.5 flex items-center gap-2">
          <Avatar name={previewName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink">{previewName}</p>
            {resolved?.specialty && <p className="truncate text-[11px] text-ink-secondary">{resolved.specialty}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

interface ResponsiblePersonSummaryProps {
  value: string | null | undefined;
  employees: Employee[];
}

/** Read-only Avatar + name (+ specialty) display for detail drawers. */
export function ResponsiblePersonSummary({ value, employees }: ResponsiblePersonSummaryProps) {
  const resolved = findEmployeeByIdOrName(value, employees);
  const name = resolved?.fullName ?? (value || "—");
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-ink">{name}</p>
        {resolved?.specialty && <p className="truncate text-xs text-ink-muted">{resolved.specialty}</p>}
      </div>
    </div>
  );
}

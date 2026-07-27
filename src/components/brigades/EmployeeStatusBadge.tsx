import { EMPLOYEE_STATUS_CONFIG, employeeStatusLabel } from "../../utils/brigadeStatus";
import { useLanguage } from "../../context/LanguageContext";
import type { EmployeeStatus } from "../../types";

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const { strings } = useLanguage();
  const config = EMPLOYEE_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dotClassName}`} aria-hidden="true" />
      {employeeStatusLabel(strings.brigades, status)}
    </span>
  );
}

import type { StaffStatus } from "../../types";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_CLASSNAME: Record<StaffStatus, string> = {
  active: "bg-green-soft text-green",
  vacation: "bg-warning-soft text-warning",
  dismissed: "bg-red-soft text-red",
};

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  const { strings } = useLanguage();
  const e = strings.employees;
  const label: Record<StaffStatus, string> = {
    active: e.statusActive,
    vacation: e.statusVacation,
    dismissed: e.statusDismissed,
  };
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CLASSNAME[status])}>
      {label[status]}
    </span>
  );
}

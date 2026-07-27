import { WORK_STATUS_CONFIG, workStatusLabel } from "../../utils/workStatus";
import { useLanguage } from "../../context/LanguageContext";
import type { WorkStatus } from "../../types";

export function WorkStatusBadge({ status }: { status: WorkStatus }) {
  const { strings } = useLanguage();
  const config = WORK_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {workStatusLabel(strings.works, status)}
    </span>
  );
}

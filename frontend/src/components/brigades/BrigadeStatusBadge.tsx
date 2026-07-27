import { BRIGADE_STATUS_CONFIG } from "../../utils/brigadeStatus";
import type { BrigadeStatus } from "../../types";

export function BrigadeStatusBadge({ status }: { status: BrigadeStatus }) {
  const config = BRIGADE_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

import { roleBadgeClassName } from "../../utils/brigadeStatus";

export function EmployeeRoleBadge({ specialty }: { specialty: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClassName(specialty)}`}>
      {specialty}
    </span>
  );
}

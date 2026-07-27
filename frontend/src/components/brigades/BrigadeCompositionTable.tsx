import { DataTable, type DataTableColumn } from "../tables/DataTable";
import { TableRowSkeleton } from "../ui/Skeleton";
import { Avatar } from "../ui/Avatar";
import { EmployeeRoleBadge } from "./EmployeeRoleBadge";
import { ShiftBadge } from "./ShiftBadge";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { EmployeeActionMenu, type EmployeeActionKind } from "./EmployeeActionMenu";
import type { Employee } from "../../types";

const COLUMN_COUNT = 6;

interface BrigadeCompositionTableProps {
  employees: Employee[];
  loading: boolean;
  onRowClick: (employee: Employee) => void;
  onAction: (action: EmployeeActionKind, employee: Employee) => void;
}

export function BrigadeCompositionTable({ employees, loading, onRowClick, onAction }: BrigadeCompositionTableProps) {
  const columns: DataTableColumn<Employee>[] = [
    {
      key: "employee",
      header: "Сотрудник",
      className: "sm:!pl-3",
      headerClassName: "sm:!pl-3",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.fullName} size="sm" />
          <div className="min-w-0 max-w-[130px]">
            <p className="truncate text-[13px] font-semibold text-ink">{row.fullName}</p>
            <p className="truncate text-xs text-ink-secondary">{row.qualificationGrade} разряд</p>
          </div>
        </div>
      ),
    },
    {
      key: "brigade",
      header: "Бригада / Роль",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="min-w-0 max-w-[130px] space-y-1">
          <p className="truncate text-[13px] text-ink">{row.brigadeName ?? "—"}</p>
          <EmployeeRoleBadge specialty={row.specialty} />
        </div>
      ),
    },
    {
      key: "object",
      header: "Объект / Смена",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="min-w-0 max-w-[120px] space-y-1">
          <p className="truncate text-[13px] text-ink">{row.objectName ?? "—"}</p>
          <ShiftBadge shift={row.shift} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => <EmployeeStatusBadge status={row.status} />,
    },
    {
      key: "phone",
      header: "Телефон",
      className: "px-1.5 whitespace-nowrap",
      headerClassName: "px-1.5",
      render: (row) => <span className="whitespace-nowrap tabular text-ink-secondary">{row.phone}</span>,
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right sm:!pr-3",
      className: "text-right sm:!pr-3",
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <EmployeeActionMenu employee={row} onAction={onAction} />
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-secondary">
              {columns.map((col) => (
                <th key={col.key} className="px-2.5 py-2.5 font-medium first:pl-5 last:pr-5">
                  {typeof col.header === "string" ? col.header : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={COLUMN_COUNT} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <DataTable columns={columns} rows={employees} rowKey={(row) => row.id} onRowClick={onRowClick} />;
}

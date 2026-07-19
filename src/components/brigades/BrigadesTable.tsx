import { DataTable, type DataTableColumn } from "../tables/DataTable";
import { TableRowSkeleton } from "../ui/Skeleton";
import { Avatar } from "../ui/Avatar";
import { ObjectImage } from "../ui/ObjectImage";
import { BrigadeIcon } from "./BrigadeIcon";
import { BrigadeStatusBadge } from "./BrigadeStatusBadge";
import { BrigadeProgressBar } from "./BrigadeProgressBar";
import { EfficiencyCircle } from "./EfficiencyCircle";
import { BrigadeActionMenu, type BrigadeActionKind } from "./BrigadeActionMenu";
import type { Brigade } from "../../types";

const COLUMN_COUNT = 6;

interface BrigadesTableProps {
  brigades: Brigade[];
  loading: boolean;
  onRowClick: (brigade: Brigade) => void;
  onAction: (action: BrigadeActionKind, brigade: Brigade) => void;
}

export function BrigadesTable({ brigades, loading, onRowClick, onAction }: BrigadesTableProps) {
  const columns: DataTableColumn<Brigade>[] = [
    {
      key: "brigade",
      header: "Бригада",
      className: "sm:!pl-3",
      headerClassName: "sm:!pl-3",
      render: (row) => (
        <div className="flex items-center gap-2">
          <BrigadeIcon number={row.number} size="sm" />
          <div className="min-w-0 max-w-[108px]">
            <p className="truncate text-[13px] font-semibold text-ink">{row.name}</p>
            <p className="truncate text-xs text-ink-secondary">{row.specialization}</p>
          </div>
        </div>
      ),
    },
    {
      key: "foreman",
      header: "Прораб",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.foremanName} size="sm" />
          <div className="min-w-0 max-w-[104px]">
            <p className="truncate text-ink">{row.foremanName}</p>
            <p className="truncate text-xs text-ink-secondary">Прораб</p>
          </div>
        </div>
      ),
    },
    {
      key: "composition",
      header: "Состав",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="whitespace-nowrap text-xs">
          <p className="font-semibold text-ink">{row.membersCount} чел.</p>
          <p className="text-ink-secondary">
            Рабочих: {row.workersCount}, Разнораб.: {row.helpersCount}
          </p>
        </div>
      ),
    },
    {
      key: "object",
      header: "Объект / Работы",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border">
            <ObjectImage src={row.imageUrl} type={row.objectType} alt={row.objectName} />
          </div>
          <div className="min-w-0 max-w-[128px]">
            <p className="truncate text-[13px] font-semibold text-ink">{row.objectName}</p>
            <p className="truncate text-xs text-ink-secondary">{row.currentWork}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <BrigadeProgressBar progress={row.workProgress} status={row.status} barClassName="w-12" />
            </div>
            <p className="text-[11px] text-ink-muted">Осталось {row.remainingDays} {pluralDays(row.remainingDays)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="flex flex-col items-start gap-1.5">
          <EfficiencyCircle value={row.efficiency} size={38} strokeWidth={3.5} />
          <BrigadeStatusBadge status={row.status} />
        </div>
      ),
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right sm:!pr-3",
      className: "text-right sm:!pr-3",
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <BrigadeActionMenu brigade={row} onAction={onAction} />
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
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={COLUMN_COUNT} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <DataTable columns={columns} rows={brigades} rowKey={(row) => row.id} onRowClick={onRowClick} />;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

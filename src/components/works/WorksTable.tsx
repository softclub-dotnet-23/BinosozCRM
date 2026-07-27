import { DataTable, type DataTableColumn } from "../tables/DataTable";
import { TableRowSkeleton } from "../ui/Skeleton";
import { Avatar } from "../ui/Avatar";
import { WorkStatusBadge } from "./WorkStatusBadge";
import { WorkProgressBar } from "./WorkProgressBar";
import { WorkActionMenu, type WorkActionKind } from "./WorkActionMenu";
import { computeActualDays } from "../../utils/workAnalytics";
import { workSectionLabel } from "../../utils/workStatus";
import { formatDateShort } from "../../utils/date";
import { useLanguage } from "../../context/LanguageContext";
import type { Work } from "../../types";

const COLUMN_COUNT = 7;

interface WorksTableProps {
  works: Work[];
  loading: boolean;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onRowClick: (work: Work) => void;
  onAction: (action: WorkActionKind, work: Work) => void;
  todayIso: string;
  /** Restricts which row actions render, e.g. for roles without Prorab/Admin-level management rights. */
  actions?: WorkActionKind[];
}

export function WorksTable({
  works,
  loading,
  selectedIds,
  allSelected,
  onToggleRow,
  onToggleAll,
  onRowClick,
  onAction,
  todayIso,
  actions,
}: WorksTableProps) {
  const { strings } = useLanguage();
  const s = strings.works;
  const c = strings.common;
  const columns: DataTableColumn<Work>[] = [
    {
      key: "select",
      sticky: "left",
      width: "40px",
      className: "sm:!pl-3",
      headerClassName: "sm:!pl-3",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="h-4 w-4 rounded border-border-strong accent-primary"
          aria-label={s.selectAllAriaLabel}
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => onToggleRow(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border-strong accent-primary"
          aria-label={s.selectRowAriaLabel(row.title)}
        />
      ),
    },
    {
      key: "work",
      header: s.colWork,
      sticky: "left",
      width: "188px",
      render: (row) => (
        <div className="min-w-0 max-w-[168px]">
          <p className="truncate text-sm font-semibold text-ink">
            <span className="text-ink-muted">{row.code}</span> {row.title}
          </p>
          <p className="truncate text-xs text-ink-secondary">{workSectionLabel(s, row.sectionId)}</p>
        </div>
      ),
    },
    {
      key: "object",
      header: s.colObjectSection,
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="min-w-0 max-w-[132px]">
          <p className="truncate text-sm text-ink">{row.objectName}</p>
          <p className="truncate text-xs text-ink-secondary">{workSectionLabel(s, row.sectionId)}</p>
        </div>
      ),
    },
    {
      key: "responsible",
      header: s.colResponsible,
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.responsible.name} size="sm" />
          <div className="min-w-0 max-w-[104px]">
            <p className="truncate text-ink">{row.responsible.name}</p>
            <p className="truncate text-xs text-ink-secondary">
              {row.responsible.role === "Прораб" ? c.roleLabels.prorab : row.responsible.role}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: s.colPlanFact,
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-ink-secondary">
            {formatDateShort(row.plannedStart).slice(0, 5)} – {formatDateShort(row.plannedEnd).slice(0, 5)}
          </p>
          <p className="text-ink-muted">
            {computeActualDays(row, todayIso)} / {row.plannedDurationDays} {s.daysShort}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: s.colStatusProgress,
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="space-y-1.5">
          <WorkStatusBadge status={row.status} />
          <WorkProgressBar progress={row.progress} status={row.status} barClassName="w-14" />
        </div>
      ),
    },
    {
      key: "actions",
      header: c.tableActions,
      sticky: "right",
      width: "56px",
      headerClassName: "text-right sm:!pr-3",
      className: "text-right sm:!pr-3",
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <WorkActionMenu work={row} onAction={onAction} actions={actions} />
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

  return <DataTable columns={columns} rows={works} rowKey={(row) => row.id} onRowClick={onRowClick} />;
}

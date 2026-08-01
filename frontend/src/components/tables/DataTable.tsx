import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Fixed column width (e.g. "24%" or "88px"). When every column supplies one, the
   * table switches to table-layout:fixed so columns never overflow their card. */
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectedRowKey?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, selectedRowKey, onRowClick }: DataTableProps<T>) {
  const isFixedLayout = columns.every((col) => col.width);

  return (
    <div className={isFixedLayout ? "overflow-hidden" : "overflow-x-auto"}>
      <table
        className={cn("w-full border-collapse text-sm", isFixedLayout ? "table-fixed" : "min-w-[860px]")}
      >
        {isFixedLayout && (
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: col.width }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr className="border-b border-border text-left text-xs text-ink-secondary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-2.5 py-2.5 font-medium leading-tight first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
                  isFixedLayout ? "whitespace-normal" : "whitespace-nowrap",
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = key === selectedRowKey;
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        onRowClick(row);
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                className={cn(
                  "border-b border-border transition-colors last:border-0",
                  onRowClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                  selected ? "bg-primary-soft/60" : "hover:bg-[#FAFAF9]",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-2 py-2.5 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
                      isFixedLayout && "align-middle overflow-hidden",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
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
  /**
   * Freezes this column to the left or right edge of the scroll area so an
   * identifying column (№, avatar+name, actions) stays visible while the rest
   * of a wide table scrolls horizontally. Requires `width` as a pixel value
   * (e.g. "220px") so stacked sticky columns can compute their offsets.
   */
  sticky?: "left" | "right";
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectedRowKey?: string;
  onRowClick?: (row: T) => void;
}

function parsePx(width: string | undefined): number {
  if (!width) return 0;
  const n = parseFloat(width);
  return Number.isNaN(n) ? 0 : n;
}

export function DataTable<T>({ columns, rows, rowKey, selectedRowKey, onRowClick }: DataTableProps<T>) {
  const isFixedLayout = columns.every((col) => col.width);

  const leftStickyCols = columns.filter((col) => col.sticky === "left");
  const rightStickyCols = columns.filter((col) => col.sticky === "right");

  const leftOffsets = new Map<string, number>();
  let leftAcc = 0;
  for (const col of leftStickyCols) {
    leftOffsets.set(col.key, leftAcc);
    leftAcc += parsePx(col.width);
  }

  const rightOffsets = new Map<string, number>();
  let rightAcc = 0;
  for (const col of [...rightStickyCols].reverse()) {
    rightOffsets.set(col.key, rightAcc);
    rightAcc += parsePx(col.width);
  }

  const lastLeftStickyKey = leftStickyCols.at(-1)?.key;
  const firstRightStickyKey = rightStickyCols[0]?.key;

  function stickyStyle(col: DataTableColumn<T>): CSSProperties | undefined {
    if (col.sticky === "left") {
      return { position: "sticky", left: leftOffsets.get(col.key), width: col.width, minWidth: col.width, zIndex: 2 };
    }
    if (col.sticky === "right") {
      return { position: "sticky", right: rightOffsets.get(col.key), width: col.width, minWidth: col.width, zIndex: 2 };
    }
    return undefined;
  }

  function stickyClass(col: DataTableColumn<T>, selected: boolean): string | undefined {
    if (!col.sticky) return undefined;
    return cn(
      selected ? "bg-primary-soft" : "bg-card group-hover:bg-surface-1",
      col.sticky === "left" && col.key === lastLeftStickyKey && "border-r border-border-strong",
      col.sticky === "right" && col.key === firstRightStickyKey && "border-l border-border-strong",
    );
  }

  // Scroll-snap treats the scrollport as full-width, with no notion of the sticky
  // columns overlapping it — scroll-padding insets where "start"/"end" snap points
  // land so a column never settles half-covered by the frozen left/right zones.
  const scrollPaddingStyle: CSSProperties | undefined = isFixedLayout
    ? undefined
    : { scrollPaddingLeft: leftAcc || undefined, scrollPaddingRight: rightAcc || undefined };

  return (
    <div
      className={isFixedLayout ? "overflow-hidden" : "table-scroll-x snap-x snap-mandatory overflow-x-auto"}
      style={scrollPaddingStyle}
    >
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
                style={stickyStyle(col)}
                className={cn(
                  "px-2.5 py-2.5 font-medium leading-tight first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
                  isFixedLayout ? "whitespace-normal" : "whitespace-nowrap",
                  !col.sticky && "snap-start",
                  col.sticky && "bg-card",
                  col.sticky === "left" && col.key === lastLeftStickyKey && "border-r border-border-strong",
                  col.sticky === "right" && col.key === firstRightStickyKey && "border-l border-border-strong",
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
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "group cursor-pointer border-b border-border transition-colors last:border-0",
                  selected ? "bg-primary-soft/60" : "hover:bg-surface-1",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={stickyStyle(col)}
                    className={cn(
                      "px-2 py-2.5 align-middle first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
                      isFixedLayout && "overflow-hidden",
                      stickyClass(col, selected),
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

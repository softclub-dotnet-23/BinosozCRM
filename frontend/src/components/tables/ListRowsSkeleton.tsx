import { Skeleton } from "../ui/Skeleton";

/**
 * Content-shaped loading placeholder for a DataTable-backed list — a few flex rows of
 * Skeleton bars instead of a single centered spinner, so the loading state roughly matches
 * the row layout it's about to be replaced by (icon/name, a couple of secondary fields, a
 * status pill). Not tied to any page's exact columns — every list's column count differs
 * slightly, and matching that exactly isn't worth the coupling.
 */
export function ListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-40" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="ml-auto h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

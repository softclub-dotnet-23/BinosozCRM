/** Windowed page list (1, 2, 3 … current … last) shared by every custom compact pagination footer
 * in the app (Materials/Photo Reports pages) — same shape as the admin ui/Pagination component's
 * own getPageList, just not tied to that component's page-size-selector layout. */
export function getPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, 3, total, current - 1, current, current + 1]);
  const filtered = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of filtered) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

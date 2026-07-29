import type { Material, MaterialReceipt, MaterialStatus, MaterialStockRow, StockReservation } from "../types";
import { buildStockRows } from "./stockAnalytics";

export interface WorkerMaterialsKpis {
  totalQty: number;
  totalValue: number;
  availableQty: number;
  availableValue: number;
  reservedQty: number;
  reservedValue: number;
  expectedQty: number;
  expectedValue: number;
}

/** Real warehouse-wide totals: total/available/reserved come straight from the same
 * buildStockRows() rows the admin Stock page already computes from the shared materials +
 * reservations repositories, and "expected" is the real sum of line quantities on receipts that
 * are still `status === "pending"` — no fabricated on-order number. */
export function computeWorkerMaterialsKpis(stockRows: MaterialStockRow[], receipts: MaterialReceipt[]): WorkerMaterialsKpis {
  const totalQty = stockRows.reduce((sum, r) => sum + r.quantity, 0);
  const totalValue = stockRows.reduce((sum, r) => sum + r.quantity * r.price, 0);
  const availableQty = stockRows.reduce((sum, r) => sum + r.available, 0);
  const availableValue = stockRows.reduce((sum, r) => sum + r.available * r.price, 0);
  const reservedQty = stockRows.reduce((sum, r) => sum + r.reserved, 0);
  const reservedValue = stockRows.reduce((sum, r) => sum + r.reserved * r.price, 0);

  let expectedQty = 0;
  let expectedValue = 0;
  for (const receipt of receipts) {
    if (receipt.status !== "pending") continue;
    for (const line of receipt.lines) {
      expectedQty += line.quantity;
      expectedValue += line.lineTotal;
    }
  }

  return { totalQty, totalValue, availableQty, availableValue, reservedQty, reservedValue, expectedQty, expectedValue };
}

export interface WorkerMaterialRow extends Material {
  reserved: number;
  available: number;
  status: MaterialStatus;
}

/** One row per real Material, widened with the same live reserved/available/status the admin
 * Stock page computes (buildStockRows), so the materials table can show both the catalog fields
 * (name, supplier, image) and the live stock numbers from a single call. */
export function buildWorkerMaterialRows(materials: Material[], reservations: StockReservation[]): WorkerMaterialRow[] {
  const stockById = new Map(buildStockRows(materials, reservations).map((r) => [r.id, r]));
  return materials.map((m) => {
    const stock = stockById.get(m.id);
    return { ...m, reserved: stock?.reserved ?? 0, available: stock?.available ?? m.stock, status: stock?.status ?? "normal" };
  });
}

export interface WorkerMaterialsTableFilters {
  search: string;
  category: string;
  unit: string;
  availableOnly: boolean;
}

export function filterWorkerMaterialRows(rows: WorkerMaterialRow[], filters: WorkerMaterialsTableFilters): WorkerMaterialRow[] {
  const query = filters.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (query && !r.name.toLowerCase().includes(query) && !r.supplier.toLowerCase().includes(query)) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.availableOnly && r.available <= 0) return false;
    return true;
  });
}

export interface CategoryStockRow {
  category: string;
  quantity: number;
  percentOfMax: number;
}

/** Real per-category totals (sum of each material's current stock), sorted highest first, with
 * each row's share of the largest category so the UI can size a progress bar without re-deriving
 * the max itself. */
export function computeCategoryStock(materials: Material[]): CategoryStockRow[] {
  const totals = new Map<string, number>();
  for (const m of materials) totals.set(m.category, (totals.get(m.category) ?? 0) + m.stock);

  const rows = Array.from(totals.entries()).map(([category, quantity]) => ({ category, quantity, percentOfMax: 0 }));
  rows.sort((a, b) => b.quantity - a.quantity);
  const max = rows[0]?.quantity ?? 1;
  return rows.map((r) => ({ ...r, percentOfMax: max > 0 ? Math.round((r.quantity / max) * 100) : 0 }));
}

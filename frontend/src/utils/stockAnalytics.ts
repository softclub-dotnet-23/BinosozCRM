import type { CategorySpend, Material, MaterialReceipt, MaterialStatus, MaterialStockRow, StockReservation } from "../types";
import { getMaterialStatus } from "./materialAnalytics";

/** Sum of active reservations held against one material at one warehouse. */
export function getReservedQuantity(materialName: string, warehouse: string, reservations: StockReservation[]): number {
  return reservations
    .filter((r) => r.status === "active" && r.materialName === materialName && r.warehouse === warehouse)
    .reduce((sum, r) => sum + r.quantity, 0);
}

/**
 * Builds the authoritative per-warehouse stock row for every material: current
 * stock and status come straight from the shared materials repository (the
 * same numbers Materials/Receipts/Write-offs/Transfers already read and
 * write), reserved is derived live from active reservations, and available
 * is clamped so it can never go negative even if reservations exceed stock.
 */
export function buildStockRows(materials: Material[], reservations: StockReservation[]): MaterialStockRow[] {
  return materials.map((m) => {
    const reserved = Math.min(m.stock, getReservedQuantity(m.name, m.warehouse, reservations));
    const available = Math.max(0, Math.round((m.stock - reserved) * 100) / 100);
    return {
      id: m.id,
      materialName: m.name,
      category: m.category,
      warehouse: m.warehouse,
      unit: m.unit,
      quantity: m.stock,
      reserved: Math.round(reserved * 100) / 100,
      available,
      minStock: m.minStock,
      status: getMaterialStatus(m),
      price: m.price,
      updatedAt: m.updatedAt,
    };
  });
}

export interface StockKpis {
  totalPositions: number;
  inStock: number;
  lowStock: number;
  critical: number;
}

export function computeStockKpis(rows: MaterialStockRow[]): StockKpis {
  return {
    totalPositions: rows.length,
    inStock: rows.filter((r) => r.status === "normal").length,
    lowStock: rows.filter((r) => r.status === "low").length,
    critical: rows.filter((r) => r.status === "critical").length,
  };
}

const STATUS_BUCKET_COLOR: Record<MaterialStatus, string> = {
  normal: "#22A447",
  low: "#F58A1F",
  critical: "#E83939",
};
const ORDERED_COLOR = "#2869C9";

const STATUS_BUCKET_LABEL: Record<MaterialStatus, string> = {
  normal: "В наличии",
  low: "Низкий остаток",
  critical: "Критично",
};

/**
 * Four mutually-exclusive buckets for the "Статистика остатков" donut. A
 * material counts as "Заказан" only if it has a real pending receipt heading
 * to it (no fabricated on-order flag); otherwise it falls into its normal
 * stock-threshold bucket, so every row is counted exactly once.
 */
export function computeStockStatusBuckets(rows: MaterialStockRow[], receipts: MaterialReceipt[]): CategorySpend[] {
  const pendingMaterialNames = new Set(
    receipts.filter((r) => r.status === "pending").flatMap((r) => r.lines.map((l) => l.materialName)),
  );

  const counts: Record<MaterialStatus | "ordered", number> = { normal: 0, low: 0, critical: 0, ordered: 0 };
  for (const row of rows) {
    if (pendingMaterialNames.has(row.materialName)) counts.ordered += 1;
    else counts[row.status] += 1;
  }

  const buckets: CategorySpend[] = [
    { category: STATUS_BUCKET_LABEL.normal, amount: counts.normal, color: STATUS_BUCKET_COLOR.normal },
    { category: STATUS_BUCKET_LABEL.low, amount: counts.low, color: STATUS_BUCKET_COLOR.low },
    { category: STATUS_BUCKET_LABEL.critical, amount: counts.critical, color: STATUS_BUCKET_COLOR.critical },
    { category: "Заказан", amount: counts.ordered, color: ORDERED_COLOR },
  ];
  return buckets.filter((b) => b.amount > 0);
}

export function getCriticalStockRows(rows: MaterialStockRow[], limit = 4): MaterialStockRow[] {
  return rows
    .filter((r) => r.status === "low" || r.status === "critical")
    .sort((a, b) => a.available / Math.max(a.minStock, 1) - b.available / Math.max(b.minStock, 1))
    .slice(0, limit);
}

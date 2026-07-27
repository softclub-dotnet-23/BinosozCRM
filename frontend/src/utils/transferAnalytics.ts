import type { MaterialTransfer } from "../types";
import { transferQuantity, transferTotal } from "../data/mockMaterialTransfers";

export interface TransferKpis {
  count: number;
  totalQuantity: number;
  totalCost: number;
  averageCost: number;
}

export function computeTransferKpis(transfers: MaterialTransfer[]): TransferKpis {
  const count = transfers.length;
  const totalQuantity = transfers.reduce((sum, t) => sum + transferQuantity(t), 0);
  const totalCost = transfers.reduce((sum, t) => sum + transferTotal(t), 0);
  const averageCost = count > 0 ? totalCost / count : 0;
  return { count, totalQuantity, totalCost, averageCost };
}

export interface RouteFrequency {
  fromWarehouse: string;
  toWarehouse: string;
  count: number;
}

export function computeFrequentRoutes(transfers: MaterialTransfer[], limit = 4): RouteFrequency[] {
  const counts = new Map<string, RouteFrequency>();
  transfers.forEach((t) => {
    const key = `${t.fromWarehouse} -> ${t.toWarehouse}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { fromWarehouse: t.fromWarehouse, toWarehouse: t.toWarehouse, count: 1 });
  });
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

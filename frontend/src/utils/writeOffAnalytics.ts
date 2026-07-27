import type { MaterialWriteOff, WriteOffReason } from "../types";
import { writeOffQuantity, writeOffTotal } from "../data/mockMaterialWriteOffs";

export interface WriteOffKpis {
  count: number;
  totalQuantity: number;
  totalCost: number;
  criticalCount: number;
}

export function computeWriteOffKpis(writeOffs: MaterialWriteOff[]): WriteOffKpis {
  const count = writeOffs.length;
  const totalQuantity = writeOffs.reduce((sum, w) => sum + writeOffQuantity(w), 0);
  const totalCost = writeOffs.reduce((sum, w) => sum + writeOffTotal(w), 0);
  const criticalCount = writeOffs.filter((w) => w.requiresReview).length;
  return { count, totalQuantity, totalCost, criticalCount };
}

export interface ReasonFrequency {
  reason: WriteOffReason;
  count: number;
}

export function computeFrequentReasons(writeOffs: MaterialWriteOff[], limit = 4): ReasonFrequency[] {
  const counts = new Map<WriteOffReason, number>();
  writeOffs.forEach((w) => counts.set(w.reason, (counts.get(w.reason) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

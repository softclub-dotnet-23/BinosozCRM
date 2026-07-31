import type { MaterialWriteOff } from "../types";
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

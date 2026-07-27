import type { MaterialReceipt } from "../types";
import { receiptQuantity, receiptTotal } from "../data/mockMaterialReceipts";

export interface ReceiptKpis {
  count: number;
  totalQuantity: number;
  totalCost: number;
  averageCost: number;
}

export function computeReceiptKpis(receipts: MaterialReceipt[]): ReceiptKpis {
  const count = receipts.length;
  const totalQuantity = receipts.reduce((sum, r) => sum + receiptQuantity(r), 0);
  const totalCost = receipts.reduce((sum, r) => sum + receiptTotal(r), 0);
  const averageCost = count > 0 ? totalCost / count : 0;
  return { count, totalQuantity, totalCost, averageCost };
}

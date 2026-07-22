import type { Material, MaterialStatus } from "../types";

export function getMaterialStatus(material: Pick<Material, "stock" | "minStock">): MaterialStatus {
  if (material.stock < material.minStock * 0.75) return "critical";
  if (material.stock < material.minStock) return "low";
  return "normal";
}

export function getMaterialTotalValue(material: Pick<Material, "stock" | "price">): number {
  return material.stock * material.price;
}

export interface MaterialKpis {
  totalCount: number;
  totalStock: number;
  totalValue: number;
}

export function computeMaterialKpis(materials: Material[]): MaterialKpis {
  const totalCount = materials.length;
  const totalStock = materials.reduce((sum, m) => sum + m.stock, 0);
  const totalValue = materials.reduce((sum, m) => sum + getMaterialTotalValue(m), 0);
  return { totalCount, totalStock, totalValue };
}

export function getCriticalMaterials(materials: Material[]): Material[] {
  return materials.filter((m) => getMaterialStatus(m) !== "normal");
}

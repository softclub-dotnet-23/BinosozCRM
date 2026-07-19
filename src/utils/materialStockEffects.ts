import { materialsRepository } from "../data/repositories";

/** Current stock of a material, optionally scoped to a specific warehouse row. */
export function getAvailableStock(materialName: string, warehouse?: string): number {
  const materials = materialsRepository.getSnapshot();
  const material = warehouse
    ? materials.find((m) => m.name === materialName && m.warehouse === warehouse)
    : materials.find((m) => m.name === materialName);
  return material?.stock ?? 0;
}

/**
 * Applies a real stock change to the shared materials repository, keyed by
 * (material name, warehouse). Positive delta increases stock; negative
 * decreases it, clamped at zero. If the material has no tracked row at that
 * warehouse yet and delta is positive (e.g. a transfer's destination), a new
 * row is cloned from an existing warehouse's catalog entry so the location
 * becomes a real, queryable stock row instead of a phantom balance.
 */
export function adjustMaterialStock(materialName: string, warehouse: string, delta: number): void {
  if (delta === 0) return;
  const materials = materialsRepository.getSnapshot();
  const existing = materials.find((m) => m.name === materialName && m.warehouse === warehouse);

  if (existing) {
    const nextStock = Math.max(0, Math.round((existing.stock + delta) * 100) / 100);
    void materialsRepository.update(existing.id, { stock: nextStock });
    return;
  }

  if (delta <= 0) return;

  const template = materials.find((m) => m.name === materialName);
  if (!template) return;

  const nextNumber = materials.length > 0 ? Math.max(...materials.map((m) => m.number)) + 1 : 1;
  void materialsRepository.create({
    ...template,
    id: `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    number: nextNumber,
    warehouse,
    stock: Math.round(delta * 100) / 100,
  });
}

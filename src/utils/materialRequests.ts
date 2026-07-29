import type { MaterialRequest } from "../types";

/** Single source for the real document-numbering scheme shared by every place that creates a
 * MaterialRequest (the worker quick-request modal and the Materials page's inline request card) —
 * kept here instead of duplicated so the sequence and document-number format never drift apart. */
export function nextMaterialRequestNumber(requests: MaterialRequest[]): number {
  return requests.length > 0 ? Math.max(...requests.map((r) => r.number)) + 1 : 1;
}

export interface NewMaterialRequestInput {
  materialName: string;
  quantity: number;
  unit: string;
  objectName: string;
  brigadeName: string;
  requestedBy: string;
  note: string;
}

export function buildMaterialRequest(input: NewMaterialRequestInput, number: number): MaterialRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `req-${Date.now()}`,
    number,
    documentNumber: `3-${new Date().getFullYear()}-${String(number).padStart(3, "0")}`,
    date: today,
    materialName: input.materialName,
    quantity: input.quantity,
    unit: input.unit,
    objectName: input.objectName,
    brigadeName: input.brigadeName,
    requestedBy: input.requestedBy,
    status: "new",
    note: input.note,
    createdDate: new Date().toISOString(),
    createdBy: input.requestedBy,
  };
}

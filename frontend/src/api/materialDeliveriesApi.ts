import { request, type PagedResult } from "./apiClient";

export interface MaterialDelivery {
  id: string;
  objectId: string;
  materialRequestId: string | null;
  documentId: string | null;
  materialName: string;
  unit: string;
  qty: number;
  unitCost: number;
  supplierName: string | null;
  deliveredAt: string;
}

export interface MaterialDeliveryDocumentLine {
  materialName: string;
  unit: string;
  qty: number;
  unitCost: number;
}

export interface MaterialDeliveryDocument {
  documentId: string;
  objectId: string;
  supplierName: string | null;
  deliveredAt: string;
  lines: MaterialDelivery[];
}

export function listMaterialDeliveries(page: number, pageSize: number): Promise<PagedResult<MaterialDelivery>> {
  return request<PagedResult<MaterialDelivery>>(`/api/v1/material-deliveries?page=${page}&pageSize=${pageSize}`);
}

export function createMaterialDeliveryDocument(objectId: string, supplierName: string | undefined, items: MaterialDeliveryDocumentLine[]): Promise<MaterialDeliveryDocument> {
  return request<MaterialDeliveryDocument>("/api/v1/material-deliveries/document", {
    method: "POST",
    body: { objectId, supplierName: supplierName || null, items },
  });
}

/**
 * No "get one document" endpoint exists — deliveries created via the bulk
 * path share a documentId on the existing flat list, so grouping happens
 * here instead of a second server round-trip. Deliveries with no
 * documentId (the pre-existing single-item path) each become their own
 * one-line "document".
 */
export function groupByDocument(deliveries: MaterialDelivery[]): MaterialDeliveryDocument[] {
  const groups = new Map<string, MaterialDelivery[]>();
  const order: string[] = [];
  for (const delivery of deliveries) {
    const key = delivery.documentId ?? `single:${delivery.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(delivery);
  }
  return order.map((key) => {
    const lines = groups.get(key)!;
    const first = lines[0];
    return {
      documentId: first.documentId ?? first.id,
      objectId: first.objectId,
      supplierName: first.supplierName,
      deliveredAt: first.deliveredAt,
      lines,
    };
  });
}

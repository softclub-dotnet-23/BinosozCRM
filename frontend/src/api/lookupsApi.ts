import { request } from "./apiClient";

/** Matches Application/Lookups/LookupItemDto.cs — deliberately just { id, name }, never a full Worker/ConstructionObject. */
export interface LookupItem {
  id: string;
  name: string;
}

export interface LookupQuery {
  ids?: string[];
  search?: string;
  limit?: number;
}

function buildLookupQuery({ ids, search, limit }: LookupQuery): string {
  const params = new URLSearchParams();
  for (const id of ids ?? []) params.append("ids", id);
  if (search) params.set("search", search);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** The backend scopes this per role (Owner: company, Prorab: permitted scope, Brigadir: own brigade) — the caller never needs to filter further. */
export function listWorkerLookups(query: LookupQuery = {}, signal?: AbortSignal): Promise<LookupItem[]> {
  return request<LookupItem[]>(`/api/v1/lookups/workers${buildLookupQuery(query)}`, { signal });
}

/** Scoped per role (Owner: company, Prorab: permitted objects, Brigadir: own brigade's WorkOrder objects). */
export function listObjectLookups(query: LookupQuery = {}, signal?: AbortSignal): Promise<LookupItem[]> {
  return request<LookupItem[]>(`/api/v1/lookups/objects${buildLookupQuery(query)}`, { signal });
}

/** Builds a memoizable id -> name map from a lookup response, for O(1) table-cell resolution instead of a request per row. */
export function toNameMap(items: LookupItem[]): Map<string, string> {
  return new Map(items.map((item) => [item.id, item.name]));
}

/** Distinct, non-empty ids only — the shape every lookup call's `ids` batch needs. */
export function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

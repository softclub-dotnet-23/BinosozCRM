import { request, type PagedResult } from "./apiClient";

export interface Customer {
  id: string;
  name: string;
  contactPerson: string | null;
  contactPhone: string | null;
}

export function listCustomers(page: number, pageSize: number): Promise<PagedResult<Customer>> {
  return request<PagedResult<Customer>>(`/api/v1/customers?page=${page}&pageSize=${pageSize}`);
}

export function createCustomer(name: string, contactPerson?: string, contactPhone?: string): Promise<Customer> {
  return request<Customer>("/api/v1/customers", {
    method: "POST",
    body: { name, contactPerson: contactPerson || null, contactPhone: contactPhone || null },
  });
}

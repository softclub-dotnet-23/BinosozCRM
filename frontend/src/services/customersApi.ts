import { apiClient } from "./apiClient";
import type { PagedResult } from "./types";

// Application/Customers/CustomerDto.cs
export interface CustomerDto {
  id: string;
  name: string;
  contactPerson: string | null;
  contactPhone: string | null;
}

export interface CreateCustomerRequest {
  name: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// CustomersController — api/v1/customers. Owner,Prorab.
export const customersApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<CustomerDto>>("/customers", { params }).then((r) => r.data),

  create: (request: CreateCustomerRequest) => apiClient.post<CustomerDto>("/customers", request).then((r) => r.data),
};

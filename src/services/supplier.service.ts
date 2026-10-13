import { loadOptions } from './api/options'
import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateSupplierInput, Supplier, UpdateSupplierInput } from '@/types/supplier'

export interface SupplierListParams extends PaginationParams {
  search?: string
}
const path = (id: number) => `/api/v1/admin/suppliers/${encodeURIComponent(id)}`

export const supplierService = {
  async list(
    params: SupplierListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Supplier>> {
    const response = await apiClient.get<ApiPaginatedResponse<Supplier>>(
      '/api/v1/admin/suppliers',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<Supplier[]> {
    return loadOptions<Supplier>('/api/v1/admin/suppliers', signal)
  },
  async get(id: number, signal?: AbortSignal): Promise<Supplier> {
    const response = await apiClient.get<Supplier | { data: Supplier }>(path(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateSupplierInput): Promise<void> {
    await apiClient.post('/api/v1/admin/suppliers', input)
  },
  async update(input: UpdateSupplierInput): Promise<void> {
    await apiClient.post('/api/v1/admin/suppliers', input)
  },
}

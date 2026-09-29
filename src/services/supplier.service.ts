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
    const categories = new Map<number, Supplier>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await supplierService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load suppliers: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all suppliers. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
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

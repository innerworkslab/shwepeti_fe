import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateWarehouseInput, Warehouse, UpdateWarehouseInput } from '@/types/warehouse'

export interface WarehouseListParams extends PaginationParams {
  search?: string
}
const path = (id: number) => `/api/v1/admin/warehouses/${encodeURIComponent(id)}`

export const warehouseService = {
  async list(
    params: WarehouseListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Warehouse>> {
    const response = await apiClient.get<ApiPaginatedResponse<Warehouse>>(
      '/api/v1/admin/warehouses',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<Warehouse[]> {
    const categories = new Map<number, Warehouse>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await warehouseService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load warehouses: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all warehouses. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
  },
  async get(id: number, signal?: AbortSignal): Promise<Warehouse> {
    const response = await apiClient.get<Warehouse | { data: Warehouse }>(path(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateWarehouseInput): Promise<void> {
    await apiClient.post('/api/v1/admin/warehouses', input)
  },
  async update(input: UpdateWarehouseInput): Promise<void> {
    await apiClient.post('/api/v1/admin/warehouses', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-active`, input)
  },
}

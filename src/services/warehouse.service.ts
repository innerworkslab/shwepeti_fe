import { loadOptions } from './api/options'
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
    return loadOptions<Warehouse>('/api/v1/admin/warehouses', signal)
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

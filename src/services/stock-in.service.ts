import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateStockInInput, StockIn, StockInStatus } from '@/types/stock-in'

export interface StockInListParams extends PaginationParams {
  search?: string
}
const path = '/api/v1/admin/stock-ins'
export const stockInService = {
  async get(id: number, signal?: AbortSignal): Promise<StockIn> {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid stock in ID.')
    const { data } = await apiClient.get<{ success: boolean; message: string; data: StockIn }>(
      `${path}/${id}`,
      { signal },
    )
    if (!data.success) throw new Error(data.message || 'Could not load stock in.')
    if (!data.data || data.data.id !== id) throw new Error('Invalid stock in response.')
    return data.data
  },
  async list(
    params: StockInListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<StockIn>> {
    const response = await apiClient.get<ApiPaginatedResponse<StockIn>>(path, { params, signal })
    return normalizePagination(response.data)
  },
  async create(input: CreateStockInInput): Promise<void> {
    await apiClient.post(path, input)
  },
  async updateStatus(id: number, input: { status: StockInStatus }): Promise<void> {
    await apiClient.post(`${path}/${encodeURIComponent(id)}/status`, input)
  },
}

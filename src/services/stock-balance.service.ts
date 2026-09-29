import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { StockBalance, StockBalanceFilters } from '@/types/stock-balance'
export interface StockBalanceListParams extends PaginationParams, StockBalanceFilters {}
export const stockBalanceService = {
  async list(
    params: StockBalanceListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<StockBalance>> {
    const response = await apiClient.get<ApiPaginatedResponse<StockBalance>>(
      '/api/v1/admin/inventory-stock-balances',
      { params, signal },
    )
    return normalizePagination(response.data)
  },
}

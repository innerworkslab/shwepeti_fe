import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { Adjustment, AdjustmentFilters } from '@/types/adjustment'

export interface AdjustmentListParams extends PaginationParams, AdjustmentFilters {
  search?: string
}
export const adjustmentService = {
  async list(
    params: AdjustmentListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Adjustment>> {
    const response = await apiClient.get<ApiPaginatedResponse<Adjustment>>(
      '/api/v1/admin/inventory-adjustments',
      { params, signal },
    )
    return normalizePagination(response.data)
  },
}

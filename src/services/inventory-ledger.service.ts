import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { InventoryLedger } from '@/types/inventory-ledger'
export interface InventoryLedgerListParams extends PaginationParams {
  search?: string
}
export const inventoryLedgerService = {
  async list(
    params: InventoryLedgerListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<InventoryLedger>> {
    const response = await apiClient.get<ApiPaginatedResponse<InventoryLedger>>(
      '/api/v1/admin/inventory-ledgers',
      { params, signal },
    )
    return normalizePagination(response.data)
  },
}

import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateTransferInput, Transfer, TransferStatus } from '@/types/transfer'

export interface TransferListParams extends PaginationParams {
  search?: string
}
const path = '/api/v1/admin/inventory-transfers'
export const transferService = {
  async list(
    params: TransferListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Transfer>> {
    const response = await apiClient.get<ApiPaginatedResponse<Transfer>>(path, { params, signal })
    return normalizePagination(response.data)
  },
  async create(input: CreateTransferInput): Promise<void> {
    await apiClient.post(path, input)
  },
  async updateStatus(id: number, input: { status: TransferStatus }): Promise<void> {
    await apiClient.post(`${path}/${encodeURIComponent(id)}/status`, input)
  },
}

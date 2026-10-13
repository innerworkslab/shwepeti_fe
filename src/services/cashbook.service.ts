import { loadOptions } from './api/options'
import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateCashbookInput, Cashbook, UpdateCashbookInput } from '@/types/cashbook'

export interface CashbookListParams extends PaginationParams {
  search?: string
}
const path = (id: number) => `/api/v1/admin/cashbooks/${encodeURIComponent(id)}`

export const cashbookService = {
  async list(
    params: CashbookListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Cashbook>> {
    const response = await apiClient.get<ApiPaginatedResponse<Cashbook>>(
      '/api/v1/admin/cashbooks',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<Cashbook[]> {
    return loadOptions<Cashbook>('/api/v1/admin/cashbooks', signal)
  },
  async get(id: number, signal?: AbortSignal): Promise<Cashbook> {
    const response = await apiClient.get<Cashbook | { data: Cashbook }>(path(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateCashbookInput): Promise<void> {
    await apiClient.post('/api/v1/admin/cashbooks', input)
  },
  async update(input: UpdateCashbookInput): Promise<void> {
    await apiClient.post('/api/v1/admin/cashbooks', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-active`, input)
  },
}

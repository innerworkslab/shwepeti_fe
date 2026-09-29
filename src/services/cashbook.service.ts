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
    const categories = new Map<number, Cashbook>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await cashbookService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load cashbooks: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all cashbooks. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
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

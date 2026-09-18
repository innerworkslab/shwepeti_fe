import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateUnitInput, Unit, UpdateUnitInput } from '@/types/unit'

export interface UnitListParams extends PaginationParams {
  search?: string
}
const path = (id: number) => `/api/v1/admin/units/${encodeURIComponent(id)}`

export const unitService = {
  async list(params: UnitListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<Unit>> {
    const response = await apiClient.get<ApiPaginatedResponse<Unit>>('/api/v1/admin/units', {
      params,
      signal,
    })
    return normalizePagination(response.data)
  },
  async get(id: number, signal?: AbortSignal): Promise<Unit> {
    const response = await apiClient.get<Unit | { data: Unit }>(path(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async listOptions(signal?: AbortSignal): Promise<Unit[]> {
    const categories = new Map<number, Unit>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await unitService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load units: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all units. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
  },
  async create(input: CreateUnitInput): Promise<void> {
    await apiClient.post('/api/v1/admin/units', input)
  },
  async update(input: UpdateUnitInput): Promise<void> {
    await apiClient.post('/api/v1/admin/units', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-active`, input)
  },
}

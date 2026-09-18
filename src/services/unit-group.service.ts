import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateUnitGroupInput, UnitGroup, UpdateUnitGroupInput } from '@/types/unit-group'

export interface UnitGroupListParams extends PaginationParams {
  search?: string
}
const path = (id: number) => `/api/v1/admin/unit-groups/${encodeURIComponent(id)}`

export const unitGroupService = {
  async list(
    params: UnitGroupListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<UnitGroup>> {
    const response = await apiClient.get<ApiPaginatedResponse<UnitGroup>>(
      '/api/v1/admin/unit-groups',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<UnitGroup[]> {
    const categories = new Map<number, UnitGroup>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await unitGroupService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load unit groups: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all unit groups. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
  },
  async get(id: number, signal?: AbortSignal): Promise<UnitGroup> {
    const response = await apiClient.get<UnitGroup | { data: UnitGroup }>(path(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateUnitGroupInput): Promise<void> {
    await apiClient.post('/api/v1/admin/unit-groups', input)
  },
  async update(input: UpdateUnitGroupInput): Promise<void> {
    await apiClient.post('/api/v1/admin/unit-groups', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-active`, input)
  },
}

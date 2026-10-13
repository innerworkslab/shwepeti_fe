import { loadOptions } from './api/options'
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
    return loadOptions<UnitGroup>('/api/v1/admin/unit-groups', signal)
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

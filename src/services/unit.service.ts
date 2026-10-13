import { loadOptions } from './api/options'
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
    return loadOptions<Unit>('/api/v1/admin/units', signal)
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

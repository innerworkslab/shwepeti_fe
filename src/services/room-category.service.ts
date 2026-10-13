import { loadOptions } from './api/options'
import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  CreateRoomCategoryInput,
  RoomCategory,
  UpdateRoomCategoryInput,
} from '@/types/room-category'

export interface RoomCategoryListParams extends PaginationParams {
  search?: string
}

export const roomCategoryService = {
  async list(
    params: RoomCategoryListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<RoomCategory>> {
    const response = await apiClient.get<ApiPaginatedResponse<RoomCategory>>(
      '/api/v1/admin/room-categories',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async create(input: CreateRoomCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/room-categories', input)
  },
  async listOptions(signal?: AbortSignal): Promise<RoomCategory[]> {
    return loadOptions<RoomCategory>('/api/v1/admin/room-categories', signal)
  },
  async update(input: UpdateRoomCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/room-categories', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(
      `/api/v1/admin/room-categories/${encodeURIComponent(id)}/toggle-active`,
      input,
    )
  },
}

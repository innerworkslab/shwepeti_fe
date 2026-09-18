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
    const categories = new Map<number, RoomCategory>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await roomCategoryService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load room categories: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all room categories. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
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

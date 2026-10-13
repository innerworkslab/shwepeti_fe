import { loadOptions } from './api/options'
import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  CreateMenuCategoryInput,
  MenuCategory,
  UpdateMenuCategoryInput,
} from '@/types/menu-category'

export interface MenuCategoryListParams extends PaginationParams {
  search?: string
}
const path = (id: number) => `/api/v1/admin/menu-categories/${encodeURIComponent(id)}`

export const menuCategoryService = {
  async list(
    params: MenuCategoryListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<MenuCategory>> {
    const response = await apiClient.get<ApiPaginatedResponse<MenuCategory>>(
      '/api/v1/admin/menu-categories',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<MenuCategory[]> {
    return loadOptions<MenuCategory>('/api/v1/admin/menu-categories', signal)
  },
  async get(id: number, signal?: AbortSignal): Promise<MenuCategory> {
    const response = await apiClient.get<MenuCategory | { data: MenuCategory }>(path(id), {
      signal,
    })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateMenuCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/menu-categories', input)
  },
  async update(input: UpdateMenuCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/menu-categories', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-active`, input)
  },
}

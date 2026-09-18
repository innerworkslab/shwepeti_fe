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
    const categories = new Map<number, MenuCategory>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await menuCategoryService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load menu categories: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all menu categories. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
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

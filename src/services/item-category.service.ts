import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  CreateItemCategoryInput,
  ItemCategory,
  UpdateItemCategoryInput,
} from '@/types/item-category'

export interface ItemCategoryListParams extends PaginationParams {
  parent_id?: number | null
  search?: string
}

export const itemCategoryService = {
  async list(
    params: ItemCategoryListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<ItemCategory>> {
    const response = await apiClient.get<ApiPaginatedResponse<ItemCategory>>(
      '/api/v1/admin/item-categories',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<ItemCategory[]> {
    const categories = new Map<number, ItemCategory>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await itemCategoryService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load item categories: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all item categories. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
  },
  async create(input: CreateItemCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/item-categories', input)
  },
  async update(input: UpdateItemCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/item-categories', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(
      `/api/v1/admin/item-categories/${encodeURIComponent(id)}/toggle-active`,
      input,
    )
  },
}

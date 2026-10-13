import { loadOptions } from './api/options'
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
  async parentOptions(signal?: AbortSignal): Promise<ItemCategory[]> {
    return loadOptions<ItemCategory>('/api/v1/admin/item-categories?parentId', signal)
  },
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
    return loadOptions<ItemCategory>('/api/v1/admin/item-categories', signal)
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

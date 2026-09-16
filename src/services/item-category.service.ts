import { apiClient } from './api/client'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  CreateItemCategoryInput,
  ItemCategory,
  UpdateItemCategoryInput,
} from '@/types/item-category'

export interface ItemCategoryListParams extends PaginationParams {
  search?: string
}

export const itemCategoryService = {
  async list(
    params: ItemCategoryListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<ItemCategory>> {
    const response = await apiClient.get<PaginatedResponse<ItemCategory>>('/item-categories', {
      params,
      signal,
    })
    return response.data
  },
  async create(input: CreateItemCategoryInput): Promise<void> {
    await apiClient.post('/item-categories', input)
  },
  async update(input: UpdateItemCategoryInput): Promise<void> {
    await apiClient.post('/item-categories', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`/item-categories/${encodeURIComponent(id)}/toggle-active`, input)
  },
}

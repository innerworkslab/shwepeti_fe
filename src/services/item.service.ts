import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateItemInput, Item, UpdateItemInput } from '@/types/item'

export interface ItemListParams extends PaginationParams {
  search?: string
}
const path = (id: number) => `/api/v1/admin/items/${encodeURIComponent(id)}`

export const itemService = {
  async list(params: ItemListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<Item>> {
    const response = await apiClient.get<ApiPaginatedResponse<Item>>('/api/v1/admin/items', {
      params,
      signal,
    })
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<Item[]> {
    const categories = new Map<number, Item>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await itemService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load items: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all items. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
  },
  async get(id: number, signal?: AbortSignal): Promise<Item> {
    const response = await apiClient.get<Item | { data: Item }>(path(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateItemInput): Promise<void> {
    await apiClient.post('/api/v1/admin/items', input)
  },
  async update(input: UpdateItemInput): Promise<void> {
    await apiClient.post('/api/v1/admin/items', input)
  },
  async updatePrice(input: { item_id: number; price: number }): Promise<void> {
    await apiClient.post('/api/v1/admin/items/price', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-active`, input)
  },
}

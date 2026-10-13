import { loadOptions } from './api/options'
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
    return loadOptions<Item>('/api/v1/admin/items', signal)
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

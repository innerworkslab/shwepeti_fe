import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateMenuInput, Menu, UpdateMenuInput } from '@/types/menu'

export interface MenuListParams extends PaginationParams {
  is_active?: number
  search?: string
}
const path = (id: number) => `/api/v1/admin/menus/${encodeURIComponent(id)}`

export const menuService = {
  async list(params: MenuListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<Menu>> {
    const response = await apiClient.get<ApiPaginatedResponse<Menu>>('/api/v1/admin/menus', {
      params,
      signal,
    })
    return normalizePagination(response.data)
  },
  async get(id: number, signal?: AbortSignal): Promise<Menu> {
    const response = await apiClient.get<Menu | { data: Menu }>(path(id), {
      signal,
    })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateMenuInput): Promise<void> {
    await apiClient.post('/api/v1/admin/menus', input)
  },
  async update(input: UpdateMenuInput): Promise<void> {
    await apiClient.post('/api/v1/admin/menus', input)
  },
  async toggleAvailable(id: number, input: { is_available: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-available`, input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(`${path(id)}/toggle-active`, input)
  },
}

import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateUserInput, UpdateUserInput, User } from '@/types/user'

export interface UserListParams extends PaginationParams {
  search?: string
}

export const userService = {
  async list(params: UserListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<ApiPaginatedResponse<User>>('/api/v1/admin/users', {
      params,
      signal,
    })
    return normalizePagination(response.data)
  },
  async get(id: number, signal?: AbortSignal): Promise<User> {
    const response = await apiClient.get<User | { data: User }>(
      `/api/v1/admin/users/${encodeURIComponent(id)}`,
      {
        signal,
      },
    )
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateUserInput): Promise<void> {
    await apiClient.post('/api/v1/admin/users', input)
  },
  async update(input: UpdateUserInput): Promise<void> {
    await apiClient.post('/api/v1/admin/users', input)
  },
}

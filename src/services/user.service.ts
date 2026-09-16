import { apiClient } from './api/client'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateUserInput, UpdateUserInput, User } from '@/types/user'

export interface UserListParams extends PaginationParams {
  search?: string
}

export const userService = {
  async list(params: UserListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<PaginatedResponse<User>>('/users', { params, signal })
    return response.data
  },
  async get(id: number, signal?: AbortSignal): Promise<User> {
    const response = await apiClient.get<User>(`/users/${encodeURIComponent(id)}`, { signal })
    return response.data
  },
  async create(input: CreateUserInput): Promise<void> {
    await apiClient.post('/users', input)
  },
  async update(input: UpdateUserInput): Promise<void> {
    await apiClient.post('/users', input)
  },
}

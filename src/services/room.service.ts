import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateRoomInput, Room, RoomStatus, UpdateRoomInput } from '@/types/room'

export interface RoomListParams extends PaginationParams {
  status?: RoomStatus
  search?: string
}
const roomPath = (id: number) => `/api/v1/admin/rooms/${encodeURIComponent(id)}`

export const roomService = {
  async list(params: RoomListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<Room>> {
    const response = await apiClient.get<ApiPaginatedResponse<Room>>('/api/v1/admin/rooms', {
      params,
      signal,
    })
    return normalizePagination(response.data)
  },
  async get(id: number, signal?: AbortSignal): Promise<Room> {
    const response = await apiClient.get<Room | { data: Room }>(roomPath(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateRoomInput): Promise<void> {
    await apiClient.post('/api/v1/admin/rooms', input)
  },
  async update(input: UpdateRoomInput): Promise<void> {
    await apiClient.post('/api/v1/admin/rooms', input)
  },
  async updateStatus(id: number, input: { status: RoomStatus }): Promise<void> {
    await apiClient.post(`${roomPath(id)}/status`, input)
  },
}

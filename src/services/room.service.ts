import { apiClient } from './api/client'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type { CreateRoomInput, Room, RoomStatus, UpdateRoomInput } from '@/types/room'

export interface RoomListParams extends PaginationParams {
  status?: RoomStatus
  search?: string
}
const roomPath = (id: number) => `/rooms/${encodeURIComponent(id)}`

export const roomService = {
  async list(params: RoomListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<Room>> {
    const response = await apiClient.get<PaginatedResponse<Room>>('/rooms', { params, signal })
    return response.data
  },
  async get(id: number, signal?: AbortSignal): Promise<Room> {
    const response = await apiClient.get<Room | { data: Room }>(roomPath(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateRoomInput): Promise<void> {
    await apiClient.post('/rooms', input)
  },
  async update(input: UpdateRoomInput): Promise<void> {
    await apiClient.post('/rooms', input)
  },
  async updateStatus(id: number, input: { status: RoomStatus }): Promise<void> {
    await apiClient.post(`${roomPath(id)}/status`, input)
  },
}

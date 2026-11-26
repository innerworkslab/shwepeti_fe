import { posApiClient } from './api/pos-client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse } from '@/types/api'
import type { Room, CreateRoomInput, UpdateRoomInput } from '@/types/room'
import type { RoomCategory } from '@/types/room-category'
export interface DailyBoard {
  date: string
  summary: Record<string, number>
  floors: {
    floor: number
    summary: Record<string, number>
    rooms: (Room & { current_booking?: { id: number; guest_name?: string }; bookings: unknown[] })[]
  }[]
}
function unwrap<T>(data: { success: boolean; message?: string; data: T }): T {
  if (!data.success) throw new Error(data.message || 'Could not load rooms.')
  return data.data
}
export const posRoomManagement = {
  async list(
    params: { page: number; perPage: number; date?: string; available?: boolean; status?: string },
    signal?: AbortSignal,
  ) {
    const { available, perPage, ...query } = params
    const { data } = await posApiClient.get<ApiPaginatedResponse<Room>>(
      available ? '/rooms/available' : '/rooms',
      { params: { ...query, per_page: perPage }, signal },
    )
    const rows = unwrap(data)
    if (!Array.isArray(rows)) throw new Error('Invalid rooms response.')
    if (!Array.isArray(data.meta)) return normalizePagination(data)
    return {
      data: rows.slice((params.page - 1) * perPage, params.page * perPage),
      total: rows.length,
      page: params.page,
      perPage,
    }
  },
  async get(id: number, signal?: AbortSignal): Promise<Room> {
    const { data } = await posApiClient.get(`/rooms/${id}`, { signal })
    return unwrap<Room>(data)
  },
  async categories(signal?: AbortSignal): Promise<RoomCategory[]> {
    const { data } = await posApiClient.get('/room-categories', { signal })
    return unwrap<RoomCategory[]>(data)
  },
  async create(input: CreateRoomInput) {
    const { data } = await posApiClient.post('/rooms', input)
    unwrap(data)
  },
  async update(input: UpdateRoomInput) {
    const { data } = await posApiClient.post('/rooms', input)
    unwrap(data)
  },
  async updateStatus(id: number, input: { status: string }) {
    const { data } = await posApiClient.post(`/rooms/${id}/status`, input)
    unwrap(data)
  },
  async board(signal?: AbortSignal): Promise<DailyBoard> {
    const { data } = await posApiClient.get('/rooms/daily-board', { signal })
    return unwrap<DailyBoard>(data)
  },
}

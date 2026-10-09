import { posApiClient } from './api/pos-client'
import type { PosRoom } from '@/types/pos-room'
interface Envelope<T> {
  success: boolean
  message: string
  data: T
  meta: unknown
}
function unwrap<T>(response: Envelope<T>): T {
  if (!response || response.success !== true)
    throw new Error(response?.message || 'Could not load rooms.')
  return response.data
}
export const posRoomService = {
  async list(signal?: AbortSignal): Promise<PosRoom[]> {
    const response = await posApiClient.get<Envelope<PosRoom[]>>('/rooms', { signal })
    const rows = unwrap(response.data)
    if (!Array.isArray(rows)) throw new Error('Invalid rooms response.')
    return rows
  },
  async available(signal?: AbortSignal): Promise<PosRoom[]> {
    const response = await posApiClient.get<Envelope<PosRoom[]>>('/rooms/available', { signal })
    const rows = unwrap(response.data)
    if (!Array.isArray(rows)) throw new Error('Invalid available rooms response.')
    return rows
  },
  async get(id: number, signal?: AbortSignal): Promise<PosRoom> {
    const response = await posApiClient.get<Envelope<PosRoom>>(`/rooms/${encodeURIComponent(id)}`, {
      signal,
    })
    const room = unwrap(response.data)
    if (!room || room.id !== id) throw new Error('The API returned a different room. Please retry.')
    return room
  },
}

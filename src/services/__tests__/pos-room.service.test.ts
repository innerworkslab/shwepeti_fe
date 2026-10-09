import { afterEach, expect, it, vi } from 'vitest'
import { posApiClient } from '../api/pos-client'
import { posRoomService } from '../pos-room.service'
afterEach(() => vi.restoreAllMocks())
const room = {
  id: 1,
  name: 'Room 101',
  room_category_id: 1,
  room_category: { id: 1, name: 'Standard', description: 'Comfortable room.', is_active: true },
  price: '45000.00',
  status: 'available',
  current_booking: null,
  updated_at: '2026-10-07 15:48:19',
}
it('unwraps nonpaginated room lists, available lists and details with cancellation', async () => {
  const get = vi
    .spyOn(posApiClient, 'get')
    .mockResolvedValueOnce({ data: { success: true, data: [room], meta: [] } })
    .mockResolvedValueOnce({ data: { success: true, data: [room], meta: [] } })
    .mockResolvedValueOnce({ data: { success: true, data: room, meta: [] } })
  const signal = new AbortController().signal
  expect(await posRoomService.list(signal)).toEqual([room])
  expect(await posRoomService.available(signal)).toEqual([room])
  expect(await posRoomService.get(1, signal)).toEqual(room)
  expect(get).toHaveBeenNthCalledWith(1, '/rooms', { signal })
  expect(get).toHaveBeenNthCalledWith(2, '/rooms/available', { signal })
  expect(get).toHaveBeenNthCalledWith(3, '/rooms/1', { signal })
})
it('rejects application failures, malformed lists and mismatched details', async () => {
  const get = vi
    .spyOn(posApiClient, 'get')
    .mockResolvedValueOnce({ data: { success: false, message: 'Unavailable' } })
  await expect(posRoomService.list()).rejects.toThrow('Unavailable')
  get.mockResolvedValueOnce({ data: { success: true, data: {} } })
  await expect(posRoomService.available()).rejects.toThrow('Invalid available rooms response.')
  get.mockResolvedValueOnce({ data: { success: true, data: { ...room, id: 2 } } })
  await expect(posRoomService.get(1)).rejects.toThrow('different room')
})

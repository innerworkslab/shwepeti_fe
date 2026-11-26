import { afterEach, expect, it, vi } from 'vitest'
import { posApiClient } from './api/pos-client'
import { posRoomManagement } from './pos-room-management.service'
vi.mock('./api/pos-client', () => ({ posApiClient: { get: vi.fn(), post: vi.fn() } }))
afterEach(() => vi.resetAllMocks())
it('lists POS rooms with dates and statuses and handles empty pagination metadata', async () => {
  vi.mocked(posApiClient.get).mockResolvedValue({
    data: { success: true, data: [{ id: 1 }, { id: 2 }], meta: [] },
  })
  const result = await posRoomManagement.list({
    page: 1,
    perPage: 15,
    date: '2026-11-26',
    status: 'dirty',
  })
  expect(result.total).toBe(2)
  expect(posApiClient.get).toHaveBeenCalledWith(
    '/rooms',
    expect.objectContaining({
      params: { page: 1, per_page: 15, date: '2026-11-26', status: 'dirty' },
    }),
  )
  await posRoomManagement.list({ page: 1, perPage: 15, available: true })
  expect(posApiClient.get).toHaveBeenLastCalledWith('/rooms/available', expect.anything())
})
it('uses POS save, status and daily board endpoints', async () => {
  vi.mocked(posApiClient.post).mockResolvedValue({ data: { success: true } })
  const input = {
    name: 'Room 101',
    room_category_id: 1,
    price: 120,
    room_beds: [{ bed_type: 'king_bed', qty: 1 }],
  }
  await posRoomManagement.create(input)
  expect(posApiClient.post).toHaveBeenLastCalledWith('/rooms', input)
  await posRoomManagement.update({ ...input, id: 1 })
  expect(posApiClient.post).toHaveBeenLastCalledWith('/rooms', { ...input, id: 1 })
  await posRoomManagement.updateStatus(1, { status: 'cleaning' })
  expect(posApiClient.post).toHaveBeenLastCalledWith('/rooms/1/status', { status: 'cleaning' })
  vi.mocked(posApiClient.get).mockResolvedValue({
    data: { success: true, data: { date: '2026-11-26', summary: { total_count: 0 }, floors: [] } },
  })
  expect((await posRoomManagement.board()).floors).toEqual([])
  expect(posApiClient.get).toHaveBeenLastCalledWith('/rooms/daily-board', expect.anything())
})

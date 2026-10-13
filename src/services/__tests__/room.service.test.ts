import { afterEach, describe, expect, it, vi } from 'vitest'
import { roomService } from '../room.service'
import { roomCategoryService } from '../room-category.service'
import { apiClient } from '../api/client'

afterEach(() => vi.restoreAllMocks())
describe('room API', () => {
  it('uses GET for lists and details and POST for create, update, and status', async () => {
    const input = {
      name: 'Room 101',
      room_category_id: 1,
      price: 120,
      room_beds: [{ bed_type: 'king_bed', qty: 1 }],
    }
    const room = { id: 1, ...input }
    const page = { data: [room], total: 1, page: 1, perPage: 20 }
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Loaded',
          data: page.data,
          meta: {
            current_page: page.page,
            per_page: page.perPage,
            total: page.total,
            last_page: 1,
          },
        },
      })
      .mockResolvedValueOnce({ data: { data: room } })
      .mockResolvedValueOnce({ data: room })
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    const signal = new AbortController().signal
    expect(await roomService.list({ page: 1 }, signal)).toEqual(page)
    expect(await roomService.get(1, signal)).toEqual(room)
    expect(await roomService.get(1, signal)).toEqual(room)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/rooms', { params: { page: 1 }, signal })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/rooms/1', { signal })
    await roomService.create(input)
    await roomService.update({ ...input, id: 1 })
    await roomService.updateStatus(1, { status: 'cleaning' })
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/rooms', input)
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/rooms', { ...input, id: 1 })
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/rooms/1/status', { status: 'cleaning' })
  })
})

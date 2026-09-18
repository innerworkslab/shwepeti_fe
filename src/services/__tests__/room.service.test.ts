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
  it('loads all category pages even when the server caps the page size', async () => {
    const first = { id: 1, name: 'First', description: null }
    const second = { id: 2, name: 'Second', description: null }
    const list = vi
      .spyOn(roomCategoryService, 'list')
      .mockResolvedValueOnce({ data: [first], total: 2, page: 1, perPage: 1 })
      .mockResolvedValueOnce({ data: [second], total: 2, page: 2, perPage: 1 })
    const signal = new AbortController().signal
    expect(await roomCategoryService.listOptions(signal)).toEqual([first, second])
    expect(list).toHaveBeenNthCalledWith(2, { page: 2, perPage: 100 }, signal)
  })
  it('rejects broken pagination and stops when loading is cancelled', async () => {
    const list = vi
      .spyOn(roomCategoryService, 'list')
      .mockResolvedValue({ data: [], total: 3, page: 1, perPage: 1 })
    await expect(roomCategoryService.listOptions()).rejects.toThrow('Could not load all')
    list.mockClear()
    const controller = new AbortController()
    controller.abort()
    await expect(roomCategoryService.listOptions(controller.signal)).rejects.toThrow()
    expect(list).not.toHaveBeenCalled()
  })
})

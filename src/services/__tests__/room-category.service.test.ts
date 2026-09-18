import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { roomCategoryService } from '../room-category.service'

afterEach(() => vi.restoreAllMocks())

describe('roomCategoryService', () => {
  it('posts only the selected boolean status to the category toggle endpoint', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await roomCategoryService.toggleActive(12, { is_active: false })
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/room-categories/12/toggle-active', {
      is_active: false,
    })
  })
  it('GETs the list with pagination, search, and cancellation', async () => {
    const data = { data: [], total: 0, page: 2, perPage: 10 }
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({
        data: {
          success: true,
          message: 'Loaded',
          data: data.data,
          meta: {
            current_page: data.page,
            per_page: data.perPage,
            total: data.total,
            last_page: 1,
          },
        },
      })
    const signal = new AbortController().signal
    const params = { page: 2, perPage: 10, search: 'suite' }
    expect(await roomCategoryService.list(params, signal)).toEqual(data)
    expect(get).toHaveBeenCalledWith('/api/v1/admin/room-categories', { params, signal })
  })

  it('POSTs both create and update to the collection endpoint with exact payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    const create = { name: 'Superior Room', description: 'Large room with premium amenities' }
    const update = {
      id: 1,
      name: 'Premium Deluxe Room',
      description: 'Updated description',
      is_active: true,
    }
    await roomCategoryService.create(create)
    await roomCategoryService.update(update)
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/room-categories', create)
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/room-categories', update)
  })
})

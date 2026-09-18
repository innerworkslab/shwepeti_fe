import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { itemCategoryService } from '../item-category.service'

afterEach(() => vi.restoreAllMocks())

describe('itemCategoryService', () => {
  it('posts only the selected boolean status to the category toggle endpoint', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await itemCategoryService.toggleActive(12, { is_active: false })
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/item-categories/12/toggle-active', {
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
    expect(await itemCategoryService.list(params, signal)).toEqual(data)
    expect(get).toHaveBeenCalledWith('/api/v1/admin/item-categories', { params, signal })
  })

  it('POSTs both create and update to the collection endpoint with exact payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    const create = {
      parent_id: null,
      name: 'Category One',
      code: 'category_one',
      description: null,
    }
    const update = {
      id: 1,
      parent_id: 2,
      name: 'Category One Updated',
      code: 'category_one',
      description: 'Updated description',
    }
    await itemCategoryService.create(create)
    await itemCategoryService.update(update)
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/item-categories', create)
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/item-categories', update)
  })
})

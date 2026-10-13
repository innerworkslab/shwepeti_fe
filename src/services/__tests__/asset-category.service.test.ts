import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { assetCategoryService } from '../asset-category.service'

afterEach(() => vi.restoreAllMocks())

describe('assetCategoryService', () => {
  it('posts only the selected boolean status to the category toggle endpoint', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await assetCategoryService.toggleActive(12, { is_active: false })
    expect(post).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/admin/asset-categories/12/toggle-active',
      {
        is_active: false,
      },
    )
  })
  it('GETs the list with pagination, search, and cancellation', async () => {
    const data = { data: [], total: 0, page: 2, perPage: 10 }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
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
    const params = { page: 2, perPage: 10, search: 'pro', parent_id: 2 }
    expect(await assetCategoryService.list(params, signal)).toEqual(data)
    expect(get).toHaveBeenCalledWith('/api/v1/admin/asset-categories', { params, signal })
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
    await assetCategoryService.create(create)
    await assetCategoryService.update(update)
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/asset-categories', create)
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/asset-categories', update)
  })
})

it('gets direct or wrapped details', async () => {
  const category = {
    id: 1,
    name: 'Equipment',
    code: 'equipment',
    parent_id: null,
    description: null,
  }
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValueOnce({ data: category })
    .mockResolvedValueOnce({ data: { data: category } })
  expect(await assetCategoryService.get(1)).toEqual(category)
  expect(await assetCategoryService.get(1)).toEqual(category)
  expect(get).toHaveBeenLastCalledWith('/api/v1/admin/asset-categories/1', { signal: undefined })
})

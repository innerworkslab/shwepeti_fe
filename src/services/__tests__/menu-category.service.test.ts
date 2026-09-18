import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { menuCategoryService } from '../menu-category.service'

afterEach(() => vi.restoreAllMocks())
describe('menuCategoryService', () => {
  it('gets paginated lists and accepts direct or wrapped detail responses', async () => {
    const group = {
      id: 1,
      name: 'Kitchen MenuCategory',
      code: 'KITCHEN',
      description: 'Lunch and dinner menus',
      sort_order: 10,
      is_active: false,
    }
    const page = { data: [group], total: 1, page: 1, perPage: 20 }
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
      .mockResolvedValueOnce({ data: group })
      .mockResolvedValueOnce({ data: { data: group } })
    const signal = new AbortController().signal
    expect(await menuCategoryService.list({ page: 1 }, signal)).toEqual(page)
    expect(await menuCategoryService.get(1, signal)).toEqual(group)
    expect(await menuCategoryService.get(1, signal)).toEqual(group)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/menu-categories', {
      params: { page: 1 },
      signal,
    })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/menu-categories/1', { signal })
  })
  it('posts exact create, update, and boolean status payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await menuCategoryService.create({
      name: 'Kitchen MenuCategory',
      code: 'KITCHEN',
      description: 'Lunch and dinner menus',
      sort_order: 10,
    })
    await menuCategoryService.update({
      id: 1,
      name: 'Updated MenuCategory',
      code: 'UPDATED',
      description: 'Updated description',
      sort_order: 0,
    })
    await menuCategoryService.toggleActive(1, { is_active: false })
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/menu-categories', {
      name: 'Kitchen MenuCategory',
      code: 'KITCHEN',
      description: 'Lunch and dinner menus',
      sort_order: 10,
    })
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/menu-categories', {
      id: 1,
      name: 'Updated MenuCategory',
      code: 'UPDATED',
      description: 'Updated description',
      sort_order: 0,
    })
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/menu-categories/1/toggle-active', {
      is_active: false,
    })
  })
})

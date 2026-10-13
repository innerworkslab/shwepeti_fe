import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { menuService } from '../menu.service'
import { menuCategoryService } from '../menu-category.service'
import { createMenuSchema } from '@/schemas/menu.schema'
const input = {
  menu_category_id: 1,
  name: 'Chicken Fried Rice',
  code: 'RICE',
  description: 'Lunch',
  price: 4500,
  cost_price: null,
  image_url: null,
  recipes: [{ item_id: 1, unit_id: 2, quantity: 150, remark: 'Chicken portion' }],
}
afterEach(() => vi.restoreAllMocks())
it('maps list metadata and direct/wrapped detail responses', async () => {
  const menu = { id: 1, ...input }
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: [menu],
        meta: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
      },
    })
    .mockResolvedValueOnce({ data: { data: menu } })
    .mockResolvedValueOnce({ data: menu })
  const params = { page: 1, search: '', is_active: 1 }
  const signal = new AbortController().signal
  expect(await menuService.list(params, signal)).toEqual({
    data: [menu],
    page: 1,
    perPage: 15,
    total: 1,
  })
  expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/menus', { params, signal })
  expect(await menuService.get(1, signal)).toEqual(menu)
  expect(await menuService.get(1, signal)).toEqual(menu)
  expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/menus/1', { signal })
})
it('posts exact create/update and independent boolean toggle payloads', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
  await menuService.create(input)
  await menuService.update({ ...input, id: 1 })
  await menuService.toggleActive(1, { is_active: false })
  await menuService.toggleAvailable(1, { is_available: false })
  expect(post.mock.calls).toEqual([
    ['/api/v1/admin/menus', input],
    ['/api/v1/admin/menus', { ...input, id: 1 }],
    ['/api/v1/admin/menus/1/toggle-active', { is_active: false }],
    ['/api/v1/admin/menus/1/toggle-available', { is_available: false }],
  ])
})
it('normalizes optional values, preserves zero cost, and rejects invalid prices/URLs', async () => {
  expect(await createMenuSchema.validate({ ...input, cost_price: '', image_url: '' })).toEqual(
    input,
  )
  expect((await createMenuSchema.validate({ ...input, cost_price: 0 })).cost_price).toBe(0)
  for (const invalid of [
    { price: -1 },
    { cost_price: -1 },
    { price: Infinity },
    { image_url: 'javascript:alert(1)' },
  ])
    await expect(createMenuSchema.validate({ ...input, ...invalid })).rejects.toThrow()
})

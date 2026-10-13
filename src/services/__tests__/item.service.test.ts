import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { itemService } from '../item.service'
import { unitService } from '../unit.service'
import { itemCategoryService } from '../item-category.service'
const input = {
  item_category_id: 1,
  name: 'Chicken',
  code: 'CHICKEN',
  stock_unit_id: 1,
  description: 'Raw chicken stock',
  min_stock: 10.5,
  item_unit_conversions: [{ from_unit_id: 1, to_unit_id: 2, conversion_factor: 1000 }],
}
afterEach(() => vi.restoreAllMocks())
describe('items API', () => {
  it('maps list metadata and accepts wrapped or direct details', async () => {
    const item = { id: 1, ...input }
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Loaded',
          data: [item],
          meta: { current_page: 2, per_page: 15, total: 16, last_page: 2 },
        },
      })
      .mockResolvedValueOnce({ data: { data: item } })
      .mockResolvedValueOnce({ data: item })
    const signal = new AbortController().signal
    expect(await itemService.list({ page: 2 }, signal)).toEqual({
      data: [item],
      page: 2,
      perPage: 15,
      total: 16,
    })
    expect(await itemService.get(1, signal)).toEqual(item)
    expect(await itemService.get(1, signal)).toEqual(item)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/items', { params: { page: 2 }, signal })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/items/1', { signal })
  })
  it('posts create, update, boolean status, and price to their exact endpoints', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await itemService.create(input)
    await itemService.update({ ...input, id: 1 })
    await itemService.toggleActive(1, { is_active: false })
    await itemService.updatePrice({ item_id: 1, price: 2500 })
    expect(post.mock.calls).toEqual([
      ['/api/v1/admin/items', input],
      ['/api/v1/admin/items', { ...input, id: 1 }],
      ['/api/v1/admin/items/1/toggle-active', { is_active: false }],
      ['/api/v1/admin/items/price', { item_id: 1, price: 2500 }],
    ])
  })
})

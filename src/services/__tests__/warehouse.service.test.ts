import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { warehouseService } from '../warehouse.service'

afterEach(() => vi.restoreAllMocks())
describe('warehouseService', () => {
  it('gets paginated lists and accepts direct or wrapped detail responses', async () => {
    const group = { id: 1, name: 'Kitchen Warehouse', code: 'KITCHEN', is_active: false }
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
    expect(await warehouseService.list({ page: 1 }, signal)).toEqual(page)
    expect(await warehouseService.get(1, signal)).toEqual(group)
    expect(await warehouseService.get(1, signal)).toEqual(group)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/warehouses', {
      params: { page: 1 },
      signal,
    })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/warehouses/1', { signal })
  })
  it('posts exact create, update, and boolean status payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await warehouseService.create({ name: 'Kitchen Warehouse', code: 'KITCHEN' })
    await warehouseService.update({ id: 1, name: 'Updated Warehouse', code: 'UPDATED' })
    await warehouseService.toggleActive(1, { is_active: false })
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/warehouses', {
      name: 'Kitchen Warehouse',
      code: 'KITCHEN',
    })
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/warehouses', {
      id: 1,
      name: 'Updated Warehouse',
      code: 'UPDATED',
    })
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/warehouses/1/toggle-active', {
      is_active: false,
    })
  })
})

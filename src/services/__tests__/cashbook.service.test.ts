import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { cashbookService } from '../cashbook.service'

afterEach(() => vi.restoreAllMocks())
describe('cashbookService', () => {
  it('gets paginated lists and accepts direct or wrapped detail responses', async () => {
    const group = {
      id: 1,
      name: 'Kitchen Cashbook',
      code: 'KITCHEN',
      type: 'cash',
      description: 'Main reception cash',
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
    expect(await cashbookService.list({ page: 1 }, signal)).toEqual(page)
    expect(await cashbookService.get(1, signal)).toEqual(group)
    expect(await cashbookService.get(1, signal)).toEqual(group)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/cashbooks', {
      params: { page: 1 },
      signal,
    })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/cashbooks/1', { signal })
  })
  it('posts exact create, update, and boolean status payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await cashbookService.create({
      name: 'Kitchen Cashbook',
      code: 'KITCHEN',
      type: 'cash',
      description: 'Main reception cash',
    })
    await cashbookService.update({ id: 1, name: 'Updated Cashbook', code: 'UPDATED', type: 'cash' })
    await cashbookService.toggleActive(1, { is_active: false })
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/cashbooks', {
      name: 'Kitchen Cashbook',
      code: 'KITCHEN',
      type: 'cash',
      description: 'Main reception cash',
    })
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/cashbooks', {
      id: 1,
      name: 'Updated Cashbook',
      code: 'UPDATED',
      type: 'cash',
    })
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/cashbooks/1/toggle-active', {
      is_active: false,
    })
  })
})

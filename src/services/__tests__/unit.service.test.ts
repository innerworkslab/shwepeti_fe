import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { unitService } from '../unit.service'

afterEach(() => vi.restoreAllMocks())
describe('unitService', () => {
  it('gets paginated lists and accepts direct or wrapped detail responses', async () => {
    const group = {
      id: 1,
      unit_group_id: 5,
      name: 'ton',
      symbol: 't',
      is_base: true,
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
    expect(await unitService.list({ page: 1 }, signal)).toEqual(page)
    expect(await unitService.get(1, signal)).toEqual(group)
    expect(await unitService.get(1, signal)).toEqual(group)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/units', { params: { page: 1 }, signal })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/units/1', { signal })
  })
  it('posts exact create, update, and boolean status payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await unitService.create({ unit_group_id: 5, name: 'ton', symbol: 't', is_base: true })
    await unitService.update({
      id: 1,
      unit_group_id: 5,
      name: 'Weight',
      symbol: 'w',
      is_base: false,
    })
    await unitService.toggleActive(1, { is_active: false })
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/units', {
      unit_group_id: 5,
      name: 'ton',
      symbol: 't',
      is_base: true,
    })
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/units', {
      id: 1,
      unit_group_id: 5,
      name: 'Weight',
      symbol: 'w',
      is_base: false,
    })
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/units/1/toggle-active', {
      is_active: false,
    })
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { unitGroupService } from '../unit-group.service'

afterEach(() => vi.restoreAllMocks())
describe('unitGroupService', () => {
  it('loads every group page for unit dropdowns and rejects invalid pagination', async () => {
    const list = vi
      .spyOn(unitGroupService, 'list')
      .mockResolvedValueOnce({ data: [{ id: 1, name: 'Weight' }], page: 1, perPage: 1, total: 2 })
      .mockResolvedValueOnce({ data: [{ id: 2, name: 'Volume' }], page: 2, perPage: 1, total: 2 })
    const signal = new AbortController().signal
    expect(await unitGroupService.listOptions(signal)).toEqual([
      { id: 1, name: 'Weight' },
      { id: 2, name: 'Volume' },
    ])
    expect(list).toHaveBeenNthCalledWith(2, { page: 2, perPage: 100 }, signal)
    list.mockResolvedValueOnce({ data: [], page: 1, perPage: 0, total: 2 })
    await expect(unitGroupService.listOptions()).rejects.toThrow('invalid pagination')
    const controller = new AbortController()
    controller.abort()
    list.mockClear()
    await expect(unitGroupService.listOptions(controller.signal)).rejects.toThrow()
    expect(list).not.toHaveBeenCalled()
  })
  it('gets paginated lists and accepts direct or wrapped detail responses', async () => {
    const group = { id: 1, name: 'ton', is_active: false }
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
    expect(await unitGroupService.list({ page: 1 }, signal)).toEqual(page)
    expect(await unitGroupService.get(1, signal)).toEqual(group)
    expect(await unitGroupService.get(1, signal)).toEqual(group)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/unit-groups', {
      params: { page: 1 },
      signal,
    })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/unit-groups/1', { signal })
  })
  it('posts exact create, update, and boolean status payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await unitGroupService.create({ name: 'ton' })
    await unitGroupService.update({ id: 1, name: 'Weight' })
    await unitGroupService.toggleActive(1, { is_active: false })
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/unit-groups', { name: 'ton' })
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/unit-groups', { id: 1, name: 'Weight' })
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/unit-groups/1/toggle-active', {
      is_active: false,
    })
  })
})

import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { posApiClient } from '../api/pos-client'
import { cashbookClosings } from '../cashbook-closing.service'
afterEach(() => vi.restoreAllMocks())
it.each([false, true])('uses the correct closing endpoints (%s)', async (pos) => {
  const client = pos ? posApiClient : apiClient
  const path = pos ? '/cashbooks' : '/api/v1/admin/cashbooks'
  const get = vi
    .spyOn(client, 'get')
    .mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 1 }],
        meta: { current_page: 2, per_page: 15, total: 20, last_page: 2 },
      },
    })
  const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { success: true } })
  const service = cashbookClosings(pos)
  expect(await service.list(5, { page: 2 })).toMatchObject({ page: 2, total: 20 })
  expect(get).toHaveBeenCalledWith(`${path}/5/closings`, { params: { page: 2 }, signal: undefined })
  await service.close({ cashbook_id: 5, remark: 'Daily Closing' })
  expect(post).toHaveBeenCalledWith(`${path}/close`, { cashbook_id: 5, remark: 'Daily Closing' })
  await expect(service.list(0, {})).rejects.toThrow('Choose a cashbook')
})

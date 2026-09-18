import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { adjustmentService } from '../adjustment.service'
afterEach(() => vi.restoreAllMocks())
it('loads adjustments with exact date query parameters and normalizes metadata', async () => {
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValue({
      data: {
        success: true,
        message: 'Loaded',
        data: [],
        meta: { current_page: 1, per_page: 15, total: 0, last_page: 1 },
      },
    })
  const params = { page: 1, date_from: '2026-09-01', date_to: '2026-09-15' }
  const signal = new AbortController().signal
  expect(await adjustmentService.list(params, signal)).toEqual({
    data: [],
    page: 1,
    perPage: 15,
    total: 0,
  })
  expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/inventory-adjustments', {
    params,
    signal,
  })
})

import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { stockBalanceService } from '../stock-balance.service'
afterEach(() => vi.restoreAllMocks())
it('sends warehouse/item filters and normalizes pagination', async () => {
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValue({
      data: {
        success: true,
        data: [],
        meta: { current_page: 1, per_page: 15, total: 0, last_page: 1 },
      },
    })
  const params = { page: 1, warehouse_id: 2, item_id: 1 }
  const signal = new AbortController().signal
  expect(await stockBalanceService.list(params, signal)).toEqual({
    data: [],
    page: 1,
    perPage: 15,
    total: 0,
  })
  expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/inventory-stock-balances', {
    params,
    signal,
  })
})

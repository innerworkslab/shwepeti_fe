import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { inventoryLedgerService } from '../inventory-ledger.service'
afterEach(() => vi.restoreAllMocks())
it('GETs ledger records with pagination, search and cancellation and normalizes metadata', async () => {
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 1, quantity: '0.000' }],
        meta: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
      },
    })
  const params = { page: 1, search: 'Rice' }
  const signal = new AbortController().signal
  expect(await inventoryLedgerService.list(params, signal)).toEqual({
    data: [{ id: 1, quantity: '0.000' }],
    page: 1,
    perPage: 15,
    total: 1,
  })
  expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/inventory-ledgers', { params, signal })
})

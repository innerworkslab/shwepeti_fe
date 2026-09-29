import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { cashbookTransactionService } from '../cashbook-transaction.service'
import { cashbookService } from '../cashbook.service'
import { createCashbookTransactionSchema } from '@/schemas/cashbook-transaction.schema'
afterEach(() => vi.restoreAllMocks())
const input = {
  cashbook_id: 3,
  transaction_type: 'income',
  amount: 25000,
  transaction_date: '2026-09-25 09:00:00',
  remark: 'Room payment',
}
it('normalizes lists and requests the specified detail and create endpoints', async () => {
  const row = { id: 7, ...input }
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: [row],
        meta: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
      },
    })
    .mockResolvedValueOnce({ data: { data: row } })
    .mockResolvedValueOnce({ data: row })
  const params = { page: 1, date_from: '2026-09-01', date_to: '2026-09-30' }
  expect(await cashbookTransactionService.list(params)).toEqual({
    data: [row],
    page: 1,
    perPage: 15,
    total: 1,
  })
  expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/cashbook-transactions', {
    params,
    signal: undefined,
  })
  expect(await cashbookTransactionService.get(7)).toEqual(row)
  expect(await cashbookTransactionService.get(7)).toEqual(row)
  expect(get).toHaveBeenLastCalledWith('/api/v1/admin/cashbook-transactions/7', {
    signal: undefined,
  })
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({})
  await cashbookTransactionService.create(input)
  expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/cashbook-transactions', input)
})
it('loads all pages of cashbook options', async () => {
  const row = { id: 1, name: 'Main', code: 'MAIN', type: 'cash' }
  const list = vi
    .spyOn(cashbookService, 'list')
    .mockResolvedValueOnce({ data: [row], total: 2, page: 1, perPage: 1 })
    .mockResolvedValueOnce({ data: [{ ...row, id: 2 }], total: 2, page: 2, perPage: 1 })
  expect(await cashbookService.listOptions()).toHaveLength(2)
  expect(list).toHaveBeenLastCalledWith({ page: 2, perPage: 100 }, undefined)
})
it('rejects invalid dates and nonpositive or infinite amounts', async () => {
  for (const amount of [0, -1, Infinity])
    await expect(createCashbookTransactionSchema.validate({ ...input, amount })).rejects.toThrow()
  await expect(
    createCashbookTransactionSchema.validate({ ...input, transaction_date: '2026-02-30 09:00:00' }),
  ).rejects.toThrow()
})

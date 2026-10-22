import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { posApiClient } from '../api/pos-client'
import { cashbookTransfers } from '../cashbook-transfer.service'
import { cashbookTransferSchema } from '@/schemas/cashbook-transfer.schema'
afterEach(() => vi.restoreAllMocks())
const payload = {
  request_id: 'b68f9b90-4aa2-4da2-8910-3a1b6cf7619d',
  from_cashbook_id: 1,
  to_cashbook_id: 5,
  amount: '100000.00',
  transfer_date: '2026-10-22 15:30:00',
  remark: 'Transfer',
}
it.each([false, true])('uses the correct portal for list, create, and detail (%s)', async (pos) => {
  const client = pos ? posApiClient : apiClient
  const path = pos ? '/cashbook-transfers' : '/api/v1/admin/cashbook-transfers'
  const row = { ...payload, id: 1, reference_no: 'CBF-1', transactions: [] }
  const get = vi
    .spyOn(client, 'get')
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: [row],
        meta: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
      },
    })
    .mockResolvedValueOnce({ data: { success: true, data: row } })
  const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { success: true } })
  const service = cashbookTransfers(pos)
  const filters = { page: 1, cashbook_id: 1, date_from: '2026-10-01', date_to: '2026-10-30' }
  expect((await service.list(filters)).total).toBe(1)
  expect(get).toHaveBeenCalledWith(path, { params: filters, signal: undefined })
  expect(await service.get(1)).toEqual(row)
  expect(get).toHaveBeenLastCalledWith(`${path}/1`, { signal: undefined })
  await service.create(payload)
  expect(post).toHaveBeenCalledWith(path, payload)
})
it('validates amounts, different cashbooks, and actual dates', async () => {
  for (const patch of [
    { amount: '0' },
    { amount: 'Infinity' },
    { amount: '1.123' },
    { to_cashbook_id: 1 },
    { transfer_date: '2026-02-30T10:00' },
  ])
    await expect(cashbookTransferSchema.validate({ ...payload, ...patch })).rejects.toThrow()
  expect(
    await cashbookTransferSchema.validate({ ...payload, transfer_date: '2026-10-22T15:30' }),
  ).toEqual(payload)
})

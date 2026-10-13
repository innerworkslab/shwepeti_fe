import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { transferService } from '../transfer.service'
import { createTransferSchema, transferStatusSchema } from '@/schemas/transfer.schema'
const input = {
  from_warehouse_id: 2,
  to_warehouse_id: 3,
  transaction_date: '2026-09-15 16:00:00',
  remark: 'Move rice to kitchen store',
  items: [{ item_id: 1, unit_id: 1, quantity: 3, expiry_date: '2026-12-31' }],
}
afterEach(() => vi.restoreAllMocks())
describe('inventory transfers', () => {
  it('maps list metadata and forwards pagination and cancellation', async () => {
    const record = { id: 7, ...input, status: 'draft' }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [record],
        meta: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
      },
    })
    const signal = new AbortController().signal
    expect(await transferService.list({ page: 1 }, signal)).toEqual({
      data: [record],
      page: 1,
      perPage: 15,
      total: 1,
    })
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/inventory-transfers', {
      params: { page: 1 },
      signal,
    })
  })
  it('posts exact creation and status payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await transferService.create(input)
    await transferService.updateStatus(7, { status: 'posted' })
    expect(post.mock.calls).toEqual([
      ['/api/v1/admin/inventory-transfers', input],
      ['/api/v1/admin/inventory-transfers/7/status', { status: 'posted' }],
    ])
  })
  it('normalizes local transaction time without changing expiry dates', async () => {
    expect(
      await createTransferSchema.validate({
        ...input,
        transaction_date: '2026-09-15T16:00:00.000',
      }),
    ).toEqual(input)
  })
  it.each(['2026-02-30', '2026-13-01', '', '2026-12-31T00:00:00'])(
    'rejects invalid expiry %s',
    async (expiry_date) => {
      await expect(
        createTransferSchema.validate({ ...input, items: [{ ...input.items[0], expiry_date }] }),
      ).rejects.toThrow()
    },
  )
  it('rejects matching warehouses, empty items, nonpositive quantities and cancelled status', async () => {
    await expect(createTransferSchema.validate({ ...input, to_warehouse_id: 2 })).rejects.toThrow(
      'Choose a different destination warehouse.',
    )
    await expect(createTransferSchema.validate({ ...input, items: [] })).rejects.toThrow(
      'Add at least one item.',
    )
    for (const quantity of [0, -1, Infinity])
      await expect(
        createTransferSchema.validate({ ...input, items: [{ ...input.items[0], quantity }] }),
      ).rejects.toThrow()
    await expect(transferStatusSchema.validate({ status: 'cancelled' })).rejects.toThrow(
      'Choose Posted.',
    )
  })
})

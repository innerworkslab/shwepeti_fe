import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { stockInService } from '../stock-in.service'
import { warehouseService } from '../warehouse.service'
import { itemService } from '../item.service'
import { createStockInSchema, stockInStatusSchema } from '@/schemas/stock-in.schema'
const input = {
  warehouse_id: 2,
  transaction_date: '2026-09-15 14:47:41',
  items: [{ item_id: 1, unit_id: 1, quantity: 10, unit_cost: 5000 }],
}
afterEach(() => vi.restoreAllMocks())
describe('stock in API', () => {
  it('maps list metadata and passes pagination, search, and cancellation', async () => {
    const record = { id: 1, ...input, status: 'posted' }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        message: 'Loaded',
        data: [record],
        meta: { current_page: 2, per_page: 15, total: 16, last_page: 2 },
      },
    })
    const params = { page: 2, search: 'kitchen' }
    const signal = new AbortController().signal
    expect(await stockInService.list(params, signal)).toEqual({
      data: [record],
      page: 2,
      perPage: 15,
      total: 16,
    })
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/admin/stock-ins', { params, signal })
  })
  it('posts the exact creation payload and both supported statuses', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    await stockInService.create(input)
    await stockInService.updateStatus(7, { status: 'posted' })
    await stockInService.updateStatus(7, { status: 'cancelled' })
    expect(post.mock.calls).toEqual([
      ['/api/v1/admin/stock-ins', input],
      ['/api/v1/admin/stock-ins/7/status', { status: 'posted' }],
      ['/api/v1/admin/stock-ins/7/status', { status: 'cancelled' }],
    ])
  })
  it.each([warehouseService, itemService])('loads all lookup pages', async (service) => {
    const get = vi.spyOn(apiClient, 'get')
    for (const page of [1, 2])
      get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: page, name: 'Option' }],
          meta: { current_page: page, per_page: 1, total: 2, last_page: 2 },
        },
      })
    expect(await service.listOptions()).toHaveLength(2)
    expect(get.mock.calls[1]?.[1]?.params.page).toBe(2)
    const controller = new AbortController()
    controller.abort()
    await expect(service.listOptions(controller.signal)).rejects.toThrow()
    expect(get).toHaveBeenCalledTimes(2)
  })
  it('preserves local date/time and adds missing seconds without timezone conversion', async () => {
    expect(
      (await createStockInSchema.validate({ ...input, transaction_date: '2026-09-15T14:47:41' }))
        .transaction_date,
    ).toBe(input.transaction_date)
    expect(
      (await createStockInSchema.validate({ ...input, transaction_date: '2026-09-15T14:47' }))
        .transaction_date,
    ).toBe('2026-09-15 14:47:00')
  })
  it('normalizes zero milliseconds emitted by date inputs', async () => {
    expect(
      (
        await createStockInSchema.validate({
          ...input,
          transaction_date: '2026-09-15T14:47:41.000',
        })
      ).transaction_date,
    ).toBe(input.transaction_date)
  })
  it.each(['2026-02-30T14:47', '2026-13-01T14:47', '2026-09-15T25:00', '', null])(
    'rejects invalid date %s',
    async (transaction_date) => {
      await expect(createStockInSchema.validate({ ...input, transaction_date })).rejects.toThrow()
    },
  )
  it('rejects empty lines, nonfinite amounts, and unsupported status', async () => {
    await expect(createStockInSchema.validate({ ...input, items: [] })).rejects.toThrow(
      'Add at least one item.',
    )
    await expect(
      createStockInSchema.validate({
        ...input,
        items: [{ ...input.items[0], quantity: Infinity }],
      }),
    ).rejects.toThrow()
    await expect(
      createStockInSchema.validate({
        ...input,
        items: [{ ...input.items[0], unit_cost: Infinity }],
      }),
    ).rejects.toThrow()
    await expect(stockInStatusSchema.validate({ status: 'draft' })).rejects.toThrow()
  })
})

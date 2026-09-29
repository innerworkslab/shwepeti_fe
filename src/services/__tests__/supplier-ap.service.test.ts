import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { supplierApService } from '../supplier-ap.service'
import { supplierService } from '../supplier.service'
import {
  createSupplierApPaymentSchema,
  updateSupplierApPaymentSchema,
  supplierApPaymentStatusSchema,
} from '@/schemas/supplier-ap.schema'
afterEach(() => vi.restoreAllMocks())
const input = {
  supplier_id: 1,
  cashbook_id: 3,
  amount: 5000,
  payment_date: '2026-09-26 23:00:00',
  remark: 'Partial settlement',
}
it('normalizes balances and scopes ledger requests to supplier ID', async () => {
  const row = { id: 10, supplier_id: 1, balance_amount: '5000.00' }
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValue({
      data: {
        success: true,
        data: [row],
        meta: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
      },
    })
  const signal = new AbortController().signal
  expect(await supplierApService.listBalances({ page: 1 }, signal)).toEqual({
    data: [row],
    page: 1,
    perPage: 15,
    total: 1,
  })
  expect(get).toHaveBeenLastCalledWith('/api/v1/admin/supplier-ap-balances', {
    params: { page: 1 },
    signal,
  })
  await supplierApService.listLedgers({ page: 1, supplier_id: 1 }, signal)
  expect(get).toHaveBeenLastCalledWith('/api/v1/admin/supplier-ap-ledgers', {
    params: { page: 1, supplier_id: 1 },
    signal,
  })
})
it('posts create, update and payment status to the supplied endpoints', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({})
  await supplierApService.createPayment(input)
  await supplierApService.updatePayment({ id: 20, ...input })
  await supplierApService.updatePaymentStatus(20, { status: 'posted' })
  expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/supplier-ap-payments', input)
  expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/supplier-ap-payments', {
    id: 20,
    ...input,
  })
  expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/supplier-ap-payments/20/status', {
    status: 'posted',
  })
})
it('validates payment fields and formats dates without timezone conversion', async () => {
  expect(
    await createSupplierApPaymentSchema.validate({
      ...input,
      payment_date: '2026-09-26T23:00:00.000',
    }),
  ).toEqual(input)
  for (const amount of [0, -1, Infinity])
    await expect(createSupplierApPaymentSchema.validate({ ...input, amount })).rejects.toThrow()
  await expect(
    createSupplierApPaymentSchema.validate({ ...input, supplier_id: '' }),
  ).rejects.toThrow()
  await expect(
    createSupplierApPaymentSchema.validate({ ...input, payment_date: '2026-02-30 23:00:00' }),
  ).rejects.toThrow()
  await expect(updateSupplierApPaymentSchema.validate(input)).rejects.toThrow()
  await expect(
    supplierApPaymentStatusSchema.validate({ id: 20, status: 'cancelled' }),
  ).rejects.toThrow()
})
it('loads suppliers across all dropdown pages', async () => {
  const list = vi
    .spyOn(supplierService, 'list')
    .mockResolvedValueOnce({ data: [{ id: 1 } as never], page: 1, perPage: 1, total: 2 })
    .mockResolvedValueOnce({ data: [{ id: 2 } as never], page: 2, perPage: 1, total: 2 })
  expect(await supplierService.listOptions()).toEqual([{ id: 1 }, { id: 2 }])
  expect(list).toHaveBeenLastCalledWith({ page: 2, perPage: 100 }, undefined)
})

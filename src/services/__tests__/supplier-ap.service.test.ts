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
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
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

it('shows the unpaginated supplier history amount and balance', async () => {
  const rows = [
    {
      id: 2,
      supplier_id: 1,
      transaction_type: 'payment',
      amount: '5000.00',
      balance_after: '35000.00',
    },
    { id: 1, supplier_id: 1, amount: '40000.00', balance_after: '40000.00' },
  ]
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: rows, meta: [] } })
  expect(await supplierApService.listLedgers({ supplier_id: 1, page: 2, perPage: 1 })).toEqual({
    data: [rows[1]],
    total: 2,
    page: 2,
    perPage: 1,
  })
})

it('loads supplier payment history and paginates an empty-meta response locally', async () => {
  const rows = [
    { id: 1, amount: '12000.00' },
    { id: 2, amount: '5000.00' },
  ]
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValue({ data: { success: true, data: rows, meta: [] } })
  const result = await supplierApService.listPayments({ supplier_id: 7, page: 2, perPage: 1 })
  expect(get).toHaveBeenCalledWith('/api/v1/admin/suppliers/7/ap-payments', expect.any(Object))
  expect(result).toEqual({ data: [rows[1]], page: 2, perPage: 1, total: 2 })
})

import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { supplierService } from '../supplier.service'
import { createSupplierSchema } from '@/schemas/supplier.schema'
afterEach(() => vi.restoreAllMocks())
const input = {
  supplier_code: 'SUP-001',
  name: 'Hotel Supply Co.',
  phone_number: '09123456789',
  email: 'sales@example.com',
  address: 'Yangon',
  bank_account_no: '00123456789',
  credit_limit_amount: 500000,
  supplier_type: 'wholesale',
  is_active: true,
}
it('normalizes supplier lists, forwards search, and fetches details', async () => {
  const row = { id: 1, ...input }
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
  const params = { page: 1, search: 'Hotel' }
  expect(await supplierService.list(params)).toEqual({
    data: [row],
    total: 1,
    page: 1,
    perPage: 15,
  })
  expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/suppliers', { params, signal: undefined })
  expect(await supplierService.get(1)).toEqual(row)
  expect(await supplierService.get(1)).toEqual(row)
  expect(get).toHaveBeenLastCalledWith('/api/v1/admin/suppliers/1', { signal: undefined })
})
it('posts exact create and update payloads', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({})
  await supplierService.create(input)
  await supplierService.update({ id: 1, ...input, is_active: false })
  expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/suppliers', input)
  expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/suppliers', {
    id: 1,
    ...input,
    is_active: false,
  })
})
it('validates email and finite nonnegative credit limits while allowing zero', async () => {
  for (const credit_limit_amount of [-1, Infinity])
    await expect(createSupplierSchema.validate({ ...input, credit_limit_amount })).rejects.toThrow()
  await expect(createSupplierSchema.validate({ ...input, email: 'invalid' })).rejects.toThrow()
  expect(
    (await createSupplierSchema.validate({ ...input, credit_limit_amount: 0 })).credit_limit_amount,
  ).toBe(0)
})

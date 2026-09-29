import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { fixedAssetService } from '../fixed-asset.service'
import { createFixedAssetSchema } from '@/schemas/fixed-asset.schema'
afterEach(() => vi.restoreAllMocks())
const input = {
  asset_code: 'FA-001',
  asset_category_id: 2,
  cashbook_id: 1,
  name: 'Refrigerator',
  serial_number: 'SN-1',
  purchase_date: '2026-09-27 10:00:00',
  purchase_amount: 2500000,
  warranty_expiry_date: '2027-09-27',
  documents: [{ name: 'Invoice', path: 'fixed-assets/invoice.pdf' }],
  remark: 'Purchased',
}
it('forwards all filters and normalizes lists and details', async () => {
  const row = { id: 10, ...input }
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
  const params = {
    page: 1,
    asset_category_id: 2,
    cashbook_id: 1,
    date_from: '2026-09-01',
    date_to: '2026-09-30',
  }
  expect(await fixedAssetService.list(params)).toEqual({
    data: [row],
    page: 1,
    perPage: 15,
    total: 1,
  })
  expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/fixed-assets', {
    params,
    signal: undefined,
  })
  expect(await fixedAssetService.get(10)).toEqual(row)
  expect(await fixedAssetService.get(10)).toEqual(row)
  expect(get).toHaveBeenLastCalledWith('/api/v1/admin/fixed-assets/10', { signal: undefined })
})
it('posts exact create/update/status payloads', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({})
  await fixedAssetService.create(input)
  await fixedAssetService.update({ id: 10, ...input })
  await fixedAssetService.updateStatus(10, { status: 'posted' })
  await fixedAssetService.updateStatus(10, { status: 'cancelled' })
  expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/fixed-assets', input)
  expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/fixed-assets', { id: 10, ...input })
  expect(post).toHaveBeenNthCalledWith(3, '/api/v1/admin/fixed-assets/10/status', {
    status: 'posted',
  })
  expect(post).toHaveBeenNthCalledWith(4, '/api/v1/admin/fixed-assets/10/status', {
    status: 'cancelled',
  })
})
it('strips document UI keys and validates dates and amounts', async () => {
  expect(
    await createFixedAssetSchema.validate(
      {
        ...input,
        purchase_date: '2026-09-27T10:00:00.000',
        documents: [{ ...input.documents[0], key: 4 }],
      },
      { stripUnknown: true },
    ),
  ).toEqual(input)
  for (const purchase_amount of [-1, Infinity])
    await expect(createFixedAssetSchema.validate({ ...input, purchase_amount })).rejects.toThrow()
  await expect(
    createFixedAssetSchema.validate({ ...input, warranty_expiry_date: '2027-02-30' }),
  ).rejects.toThrow()
  await expect(
    createFixedAssetSchema.validate({ ...input, documents: [{ name: 'Invoice', path: '' }] }),
  ).rejects.toThrow()
})

import { expect, it } from 'vitest'
import { multipart } from '../api/multipart'
import { createFixedAssetSchema } from '@/schemas/fixed-asset.schema'
const asset = {
  asset_code: 'FA-1',
  name: 'Computer',
  asset_category_id: 1,
  cashbook_id: 1,
  serial_number: '',
  location: 'Office',
  purchase_date: '2026-10-15T10:00',
  purchase_amount: 1500000,
  depreciation_enabled: false,
  documents: [],
  remark: '',
}
it('requires depreciation fields only when enabled and strips them otherwise', async () => {
  const result = await createFixedAssetSchema.validate({ ...asset, useful_life_months: 36 })
  expect(result).not.toHaveProperty('useful_life_months')
  await expect(
    createFixedAssetSchema.validate({ ...asset, depreciation_enabled: true }),
  ).rejects.toThrow()
  const enabled = await createFixedAssetSchema.validate({
    ...asset,
    depreciation_enabled: true,
    depreciation_start_date: '2026-11-01',
    useful_life_months: 36,
    residual_value: 150000,
  })
  expect(enabled.useful_life_months).toBe(36)
  await expect(
    createFixedAssetSchema.validate({ ...enabled, residual_value: 2000000 }),
  ).rejects.toThrow()
})
it('preserves uploaded files and serializes nested multipart fields', async () => {
  const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' })
  const payload = await createFixedAssetSchema.validate({
    ...asset,
    documents: [{ name: 'Invoice', path: file }],
  })
  const data = multipart(payload)
  expect(data.get('documents[0][path]')).toBeInstanceOf(File)
  expect(data.get('documents[0][name]')).toBe('Invoice')
  expect(data.get('depreciation_enabled')).toBe('0')
  expect(data.get('purchase_date')).toBe('2026-10-15 10:00:00')
})

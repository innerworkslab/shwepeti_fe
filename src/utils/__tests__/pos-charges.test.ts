import { expect, it } from 'vitest'
import { object } from 'yup'
import { calculatePosCharges } from '../pos-charges'
import { posChargeFields } from '@/schemas/pos-charges.schema'

it('calculates independent charges on the discounted subtotal and rounds cents', () => {
  expect(calculatePosCharges(2000, 200, 5, 10)).toEqual({
    tax_amount: 90,
    service_charge_amount: 180,
    total: 2070,
  })
  expect(calculatePosCharges(99.99, 0, 5, 10)).toEqual({
    tax_amount: 5,
    service_charge_amount: 10,
    total: 114.99,
  })
  expect(calculatePosCharges(100, 100, 5, 10)).toEqual({
    tax_amount: 0,
    service_charge_amount: 0,
    total: 0,
  })
})
it('rejects invalid percentages and amounts', async () => {
  const schema = object(posChargeFields)
  const input = {
    tax_percentage: 0,
    tax_amount: 0,
    service_charge_percentage: 0,
    service_charge_amount: 0,
  }
  for (const key of ['tax_percentage', 'service_charge_percentage']) {
    for (const value of [-1, 101, Infinity, ''])
      await expect(schema.validate({ ...input, [key]: value })).rejects.toThrow()
  }
  await expect(schema.validate({ ...input, tax_amount: NaN })).rejects.toThrow()
})

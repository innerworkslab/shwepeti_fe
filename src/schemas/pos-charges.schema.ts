import { number } from 'yup'

const nonnegative = (label: string) =>
  number()
    .typeError(`${label} must be a number.`)
    .min(0, `${label} cannot be negative.`)
    .test('finite', `${label} must be finite.`, (value) => value == null || Number.isFinite(value))
    .required(`${label} is required.`)

export const posChargeFields = {
  tax_percentage: nonnegative('Tax percentage').max(100),
  tax_amount: nonnegative('Tax amount'),
  service_charge_percentage: nonnegative('Service charge percentage').max(100),
  service_charge_amount: nonnegative('Service charge amount'),
}

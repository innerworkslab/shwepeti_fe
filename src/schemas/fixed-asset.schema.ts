import { array, number, object, string } from 'yup'
// Preserve the wall-clock time entered by the user; the API expects no timezone suffix.
export function formatTransactionDate(value: string): string {
  const normalized = value.replace('T', ' ').replace(/(\d{2}:\d{2}:\d{2})\.0+$/, '$1')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}
function validTransactionDate(value: string | undefined): boolean {
  if (!value) return false
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return (
    year >= 1000 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= days &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59
  )
}

const id = (label: string) =>
  number()
    .typeError(`Choose ${label}.`)
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required(`Choose ${label}.`)
export const createFixedAssetSchema = object({
  asset_code: string().trim().required('Asset code is required.'),
  name: string().trim().required('Name is required.'),
  asset_category_id: id('an asset category'),
  cashbook_id: id('a cashbook'),
  serial_number: string().trim().defined(),
  purchase_date: string()
    .transform((value) => (typeof value === 'string' ? formatTransactionDate(value) : value))
    .required('Purchase date is required.')
    .test('date', 'Enter a valid purchase date and time.', validTransactionDate),
  purchase_amount: number()
    .typeError('Enter a purchase amount.')
    .min(0, 'Purchase amount cannot be negative.')
    .test(
      'finite',
      'Purchase amount must be finite.',
      (value) => value == null || Number.isFinite(value),
    )
    .required('Purchase amount is required.'),
  warranty_expiry_date: string()
    .required('Warranty expiry date is required.')
    .test(
      'date',
      'Enter a valid warranty expiry date.',
      (value) => !!value && validTransactionDate(`${value} 00:00:00`),
    ),
  documents: array()
    .of(
      object({
        name: string().trim().required('Document name is required.'),
        path: string().trim().required('Document path is required.'),
      }),
    )
    .required(),
  remark: string().trim().defined(),
})
export const updateFixedAssetSchema = createFixedAssetSchema.shape({ id: id('an asset ID') })
export const fixedAssetStatusSchema = object({
  status: string<'posted' | 'cancelled'>()
    .oneOf(['posted', 'cancelled'])
    .required('Choose a status.'),
})

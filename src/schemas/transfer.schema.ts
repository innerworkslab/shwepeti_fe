import { array, number, object, ref, string } from 'yup'
import type { TransferStatus } from '@/types/transfer'

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
const amount = (label: string) =>
  number()
    .typeError(`${label} must be a number.`)
    .test('finite', `${label} must be finite.`, (value) => value == null || Number.isFinite(value))
    .required(`${label} is required.`)
export const createTransferSchema = object({
  from_warehouse_id: id('a source warehouse'),
  to_warehouse_id: id('a destination warehouse').notOneOf(
    [ref('from_warehouse_id')],
    'Choose a different destination warehouse.',
  ),
  remark: string().trim().defined(),
  transaction_date: string()
    .transform((value) => (typeof value === 'string' ? formatTransactionDate(value) : value))
    .required('Transaction date is required.')
    .test('date', 'Enter a valid transaction date and time.', validTransactionDate),
  items: array()
    .of(
      object({
        item_id: id('an item'),
        unit_id: id('a unit'),
        quantity: amount('Quantity').moreThan(0, 'Quantity must be greater than zero.'),
        expiry_date: string()
          .required('Expiry date is required.')
          .test(
            'date',
            'Enter a valid expiry date.',
            (value) => !!value && validTransactionDate(`${value} 00:00:00`),
          ),
      }),
    )
    .min(1, 'Add at least one item.')
    .required('Add at least one item.'),
})
export const transferStatusSchema = object({
  status: string<TransferStatus>().oneOf(['posted'], 'Choose Posted.').required('Choose a status.'),
})

import { number, object, string, type InferType } from 'yup'
import { formatTransactionDate, validTransactionDate } from './cashbook-transaction.schema'
export const bookingPaymentMethods = ['kpay', 'wave', 'aya', 'cash'] as const
export const bookingPaymentSchema = object({
  cashbook_id: number()
    .typeError('Choose a cashbook.')
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required('Choose a cashbook.'),
  payment_method: string().oneOf(bookingPaymentMethods).required('Choose a payment method.'),
  amount: number()
    .typeError('Enter an amount.')
    .min(0, 'Amount cannot be negative.')
    .test('finite', 'Enter a finite amount.', (value) => value == null || Number.isFinite(value))
    .required('Amount is required.'),
  paid_at: string()
    .transform((value) => (typeof value === 'string' ? formatTransactionDate(value) : value))
    .required()
    .test('date', 'Enter a valid payment date and time.', validTransactionDate),
  note: string().trim().defined(),
})
export type BookingPaymentInput = InferType<typeof bookingPaymentSchema>

export const partialPaymentSchema = bookingPaymentSchema.shape({
  cashbook_id: number()
    .typeError('Choose a cashbook.')
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required('Choose a cashbook.'),
})
export type PartialPaymentInput = InferType<typeof partialPaymentSchema>

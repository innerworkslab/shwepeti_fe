import { boolean, number, object, string, type InferType } from 'yup'
import { formatTransactionDate, validTransactionDate } from './cashbook-transaction.schema'
const positive = () =>
  number()
    .typeError('Enter a number.')
    .positive('Must be greater than zero.')
    .test('finite', 'Enter a finite number.', (value) => value == null || Number.isFinite(value))
const dateTime = () =>
  string()
    .transform((value) => (typeof value === 'string' ? formatTransactionDate(value) : value))
    .required('Date and time are required.')
    .test('date', 'Enter a valid date and time.', validTransactionDate)
export const posBookingSchema = object({
  room_id: positive().integer().max(Number.MAX_SAFE_INTEGER).required('Choose a room.'),
  booking_type: string()
    .oneOf(['reservation', 'walk_in'] as const)
    .required(),
  guest_name: string().trim().required('Guest name is required.'),
  charge_type: string()
    .oneOf(['day', 'session'] as const)
    .required(),
  expected_check_in_at: dateTime(),
  expected_check_out_at: dateTime().test(
    'after',
    'Check-out must be after check-in.',
    function (value) {
      return !value || !this.parent.expected_check_in_at || value > this.parent.expected_check_in_at
    },
  ),
  session_hours: positive()
    .nullable()
    .when('charge_type', {
      is: 'session',
      then: (schema) => schema.required('Session hours are required.'),
      otherwise: (schema) => schema.transform(() => null).default(null),
    }),
  session_rate: positive()
    .nullable()
    .when('charge_type', {
      is: 'session',
      then: (schema) => schema.required('Session rate is required.'),
      otherwise: (schema) => schema.transform(() => null).default(null),
    }),
  note: string().trim().defined(),
  include_deposit: boolean().default(false),
  deposit: object({
    amount: positive().required('Deposit amount is required.'),
    payment_method: string()
      .oneOf(['cash', 'kpay', 'wavepay', 'ayapay'] as const)
      .required(),
    paid_at: dateTime(),
    note: string().trim().defined(),
  })
    .default(undefined)
    .when(['booking_type', 'include_deposit'], {
      is: (type: string, included: boolean) => type === 'reservation' && included,
      then: (schema) => schema.required('Enter deposit details.'),
      otherwise: (schema) => schema.strip(),
    }),
})
export type PosBookingInput = Omit<InferType<typeof posBookingSchema>, 'include_deposit'>
export async function bookingPayload(value: unknown): Promise<PosBookingInput> {
  const { include_deposit: _included, ...payload } = await posBookingSchema.validate(value, {
    abortEarly: false,
    stripUnknown: true,
  })
  return payload
}

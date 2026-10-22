import { number, object, string, ref } from 'yup'
import { formatTransactionDate, validTransactionDate } from './cashbook-transaction.schema'
export const cashbookTransferSchema = object({
  request_id: string().uuid().required(),
  from_cashbook_id: number().typeError('Choose a source cashbook.').integer().positive().required(),
  to_cashbook_id: number()
    .typeError('Choose a destination cashbook.')
    .integer()
    .positive()
    .notOneOf([ref('from_cashbook_id')], 'Choose different source and destination cashbooks.')
    .required(),
  amount: string()
    .trim()
    .required('Enter an amount.')
    .matches(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.')
    .test(
      'positive',
      'Amount must be greater than zero.',
      (v) => Number.isFinite(Number(v)) && Number(v) > 0,
    ),
  transfer_date: string()
    .transform((v) => (typeof v === 'string' ? formatTransactionDate(v) : v))
    .required()
    .test('date', 'Enter a valid transfer date and time.', validTransactionDate),
  remark: string().trim().defined(),
})

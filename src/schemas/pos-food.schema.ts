import { posChargeFields } from './pos-charges.schema'
import { array, number, object, string } from 'yup'
const amount = () =>
  number()
    .typeError('Enter a valid amount.')
    .min(0)
    .test('finite', 'Amount must be finite.', (value) => value == null || Number.isFinite(value))
    .required()
const id = () => number().integer().positive().max(Number.MAX_SAFE_INTEGER).required()
export const foodOrderSchema = object({
  booking_id: id(),
  room_id: id(),
  items: array()
    .of(object({ menu_id: id(), qty: id(), note: string().trim().defined() }))
    .min(1, 'Add at least one menu item.')
    .required(),
  discount_amount: amount(),
  ...posChargeFields,
  note: string().trim().defined(),
})

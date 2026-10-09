import { roomStatuses } from '@/constants/hotel-status'
import { array, number, object, string } from 'yup'

const positiveId = number()
  .typeError('Choose a room category.')
  .integer()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)
export const createRoomSchema = object({
  name: string().trim().required('Room name is required.'),
  room_category_id: positiveId.required('Room category is required.'),
  price: number()
    .transform((value, original) => (original === '' ? undefined : value))
    .typeError('Enter a valid price.')
    .min(0, 'Price cannot be negative.')
    .test(
      'finite',
      'Enter a finite price.',
      (value) => value === undefined || Number.isFinite(value),
    )
    .required('Price is required.'),
  room_beds: array()
    .of(
      object({
        bed_type: string().trim().required('Bed type is required.'),
        qty: number()
          .typeError('Enter a valid quantity.')
          .integer('Quantity must be a whole number.')
          .min(1, 'Quantity must be at least one.')
          .max(Number.MAX_SAFE_INTEGER)
          .required('Quantity is required.'),
      }),
    )
    .min(1, 'Add at least one bed.')
    .required(),
})
export const updateRoomSchema = createRoomSchema.shape({
  id: number().integer().positive().required(),
})
export const roomStatusSchema = object({
  status: string()
    .trim()
    .oneOf(roomStatuses, 'Choose a valid room status.')
    .required('Status is required.'),
})

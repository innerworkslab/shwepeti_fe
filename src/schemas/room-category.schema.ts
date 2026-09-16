import { boolean, number, object, string } from 'yup'

export const roomCategoryStatusSchema = object({
  is_active: boolean().required('Choose the category status.'),
})

export const createRoomCategorySchema = object({
  name: string().trim().required('Name is required.'),
  description: string().trim().required('Description is required.'),
})

export const updateRoomCategorySchema = createRoomCategorySchema.shape({
  id: number()
    .transform((value, original) => (original === '' ? undefined : value))
    .typeError('Enter a valid category ID.')
    .integer('Category ID must be a whole number.')
    .positive('Category ID must be greater than zero.')
    .max(Number.MAX_SAFE_INTEGER, 'Category ID is too large.')
    .required('Category ID is required.'),
  is_active: boolean().required('Choose the category status.'),
})

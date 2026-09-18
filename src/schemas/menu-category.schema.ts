import { boolean, number, object, string } from 'yup'

export const createMenuCategorySchema = object({
  name: string().trim().required('Name is required.'),
  code: string().trim().required('Code is required.'),
  description: string().trim().defined(),
  sort_order: number()
    .typeError('Sort order must be a whole number.')
    .integer('Sort order must be a whole number.')
    .min(0, 'Sort order cannot be negative.')
    .max(Number.MAX_SAFE_INTEGER)
    .required('Sort order is required.'),
})
export const updateMenuCategorySchema = createMenuCategorySchema.shape({
  id: number()
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required('MenuCategory ID is required.'),
})
export const menuCategoryStatusSchema = object({
  is_active: boolean().required('Choose the menu category status.'),
})

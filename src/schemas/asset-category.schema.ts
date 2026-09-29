import { boolean, number, object, string } from 'yup'

const categoryId = number()
  .typeError('Enter a valid category ID.')
  .integer('Category ID must be a whole number.')
  .positive('Category ID must be greater than zero.')
  .max(Number.MAX_SAFE_INTEGER, 'Category ID is too large.')

export const assetCategoryStatusSchema = object({
  is_active: boolean().required('Choose the category status.'),
})

const parentId = categoryId
  .nullable()
  .transform((value, original) => (original === '' || original === null ? null : value))
  .default(null)

export const createAssetCategorySchema = object({
  parent_id: parentId,
  name: string().trim().required('Name is required.'),
  code: string().trim().required('Code is required.'),
  description: string()
    .trim()
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .default(null),
})

export const updateAssetCategorySchema = createAssetCategorySchema.shape({
  id: categoryId.required('Category ID is required.'),
  parent_id: parentId.test('not-self', 'A category cannot be its own parent.', function (value) {
    return value === null || value !== this.parent.id
  }),
})

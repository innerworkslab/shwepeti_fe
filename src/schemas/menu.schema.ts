import { array, mixed, boolean, number, object, string } from 'yup'
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
    .min(0, `${label} cannot be negative.`)
    .test('finite', `${label} must be finite.`, (value) => value == null || Number.isFinite(value))
export const createMenuSchema = object({
  warehouse_id: id('a warehouse'),
  menu_category_id: id('a menu category'),
  name: string().trim().required('Name is required.'),
  code: string().trim().required('Code is required.'),
  description: string().trim().defined(),
  price: amount('Price').required('Price is required.'),
  cost_price: amount('Cost price')
    .transform((value, original) => (original === '' ? null : value))
    .nullable()
    .defined(),
  image_url: mixed<string | File>()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .defined()
    .test(
      'image',
      'Choose an image file.',
      (v) =>
        v == null || typeof v === 'string' || (v instanceof File && v.type.startsWith('image/')),
    ),
  recipes: array()
    .of(
      object({
        item_id: id('an item'),
        unit_id: id('a unit'),
        quantity: amount('Quantity')
          .moreThan(0, 'Quantity must be greater than zero.')
          .required('Quantity is required.'),
        remark: string().trim().defined(),
      }),
    )
    .required(),
})
export const updateMenuSchema = createMenuSchema.shape({ id: id('a menu') })
export const menuStatusSchema = object({ is_active: boolean().required('Choose the menu status.') })
export const menuAvailabilitySchema = object({
  is_available: boolean().required('Choose availability.'),
})

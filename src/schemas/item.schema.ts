import { array, boolean, number, object, string } from 'yup'
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
    .required(`${label} is required.`)
export const createItemSchema = object({
  item_category_id: id('an item category'),
  name: string().trim().required('Name is required.'),
  code: string().trim().required('Code is required.'),
  stock_unit_id: id('a stock unit'),
  description: string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .defined(),
  min_stock: amount('Minimum stock'),
  item_unit_conversions: array()
    .of(
      object({
        from_unit_id: id('a source unit'),
        to_unit_id: id('a destination unit'),
        conversion_factor: amount('Conversion factor').moreThan(
          0,
          'Conversion factor must be greater than zero.',
        ),
      }),
    )
    .required(),
})
export const updateItemSchema = createItemSchema.shape({ id: id('an item') })
export const itemStatusSchema = object({ is_active: boolean().required('Choose the item status.') })
export const itemPriceSchema = object({ item_id: id('an item'), price: amount('Price') })

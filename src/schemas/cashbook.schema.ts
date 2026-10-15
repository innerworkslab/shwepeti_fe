import { boolean, number, object, string } from 'yup'

export const createCashbookSchema = object({
  name: string().trim().required('Name is required.'),
  code: string().trim().required('Code is required.'),
  type: string()
    .trim()
    .oneOf(['cash', 'bank', 'pos_cash', 'pos_bank'], 'Choose a valid cashbook type.')
    .required('Type is required.'),
  description: string().trim().defined(),
})
export const updateCashbookSchema = createCashbookSchema.omit(['description']).shape({
  id: number()
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required('Cashbook ID is required.'),
})
export const cashbookStatusSchema = object({
  is_active: boolean().required('Choose the cashbook status.'),
})

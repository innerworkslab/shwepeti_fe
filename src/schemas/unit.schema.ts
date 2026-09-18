import { boolean, number, object, string } from 'yup'

export const createUnitSchema = object({
  unit_group_id: number()
    .typeError('Choose a unit group.')
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required('Unit group is required.'),
  name: string().trim().required('Name is required.'),
  symbol: string().trim().required('Symbol is required.'),
  is_base: boolean().required('Choose whether this is a base unit.'),
})
export const updateUnitSchema = createUnitSchema.shape({
  id: number().integer().positive().max(Number.MAX_SAFE_INTEGER).required('Unit ID is required.'),
})
export const unitStatusSchema = object({ is_active: boolean().required('Choose the unit status.') })

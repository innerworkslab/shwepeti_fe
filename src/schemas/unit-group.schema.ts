import { boolean, number, object, string } from 'yup'

export const createUnitGroupSchema = object({ name: string().trim().required('Name is required.') })
export const updateUnitGroupSchema = createUnitGroupSchema.shape({
  id: number()
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required('Unit group ID is required.'),
})
export const unitGroupStatusSchema = object({
  is_active: boolean().required('Choose the unit group status.'),
})

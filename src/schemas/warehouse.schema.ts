import { boolean, number, object, string } from 'yup'

export const createWarehouseSchema = object({
  name: string().trim().required('Name is required.'),
  code: string().trim().required('Code is required.'),
})
export const updateWarehouseSchema = createWarehouseSchema.shape({
  id: number()
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required('Warehouse ID is required.'),
})
export const warehouseStatusSchema = object({
  is_active: boolean().required('Choose the warehouse status.'),
})

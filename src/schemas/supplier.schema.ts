import { supplierTypes } from '@/constants/admin-options'
import { boolean, number, object, string } from 'yup'
export const createSupplierSchema = object({
  supplier_code: string().trim().required('Supplier code is required.'),
  name: string().trim().required('Name is required.'),
  phone_number: string().trim().defined(),
  email: string().trim().email('Enter a valid email address.').defined(),
  address: string().trim().defined(),
  bank_account_no: string().trim().defined(),
  credit_limit_amount: number()
    .typeError('Enter a credit limit.')
    .min(0, 'Credit limit cannot be negative.')
    .test(
      'finite',
      'Credit limit must be finite.',
      (value) => value == null || Number.isFinite(value),
    )
    .required('Credit limit is required.'),
  supplier_type: string().oneOf(supplierTypes).required('Supplier type is required.'),
  is_active: boolean().required('Choose a status.'),
})
export const updateSupplierSchema = createSupplierSchema.shape({
  id: number().integer().positive().max(Number.MAX_SAFE_INTEGER).required(),
})

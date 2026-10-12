import { userRoles, portalAccessOptions } from '@/constants/admin-options'
import { number, object, string } from 'yup'

export const createUserSchema = object({
  name: string().trim().required('Name is required.'),
  email: string().trim().email('Enter a valid email address.').required('Email is required.'),
  // Do not trim or prefill passwords: preserve exactly what the user enters.
  password: string().required('Password is required.'),
  role: string()
    .transform((value) => (value === '' ? undefined : value))
    .oneOf(userRoles)
    .required('Role is required.'),
  portal_access: string().oneOf(portalAccessOptions).required('Portal access is required.'),
})

export const updateUserSchema = createUserSchema.shape({
  id: number().integer().positive().max(Number.MAX_SAFE_INTEGER).required('User ID is required.'),
})

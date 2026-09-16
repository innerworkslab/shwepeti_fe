import { number, object, string } from 'yup'

export const createUserSchema = object({
  name: string().trim().required('Name is required.'),
  email: string().trim().email('Enter a valid email address.').required('Email is required.'),
  // Do not trim or prefill passwords: preserve exactly what the user enters.
  password: string().required('Password is required.'),
  role: string().trim().required('Role is required.'),
})

export const updateUserSchema = createUserSchema.shape({
  id: number().integer().positive().max(Number.MAX_SAFE_INTEGER).required('User ID is required.'),
})

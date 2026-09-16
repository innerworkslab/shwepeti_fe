import { object, string } from 'yup'

export const loginSchema = object({
  email: string().trim().email('Enter a valid email address.').required('Email is required.'),
  password: string().required('Password is required.'),
})

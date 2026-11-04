export interface User {
  permissions?: string[]
  id: number
  name: string
  email: string
  portal_access?: string
  role: string
}

export interface CreateUserInput {
  permissions?: string[]
  name: string
  email: string
  password: string
  portal_access: string
  role: string
}

export interface UpdateUserInput extends CreateUserInput {
  id: number
}

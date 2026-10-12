export interface User {
  id: number
  name: string
  email: string
  portal_access?: string
  role: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  portal_access: string
  role: string
}

export interface UpdateUserInput extends CreateUserInput {
  id: number
}

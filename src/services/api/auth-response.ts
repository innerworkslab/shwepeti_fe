import type { User } from '@/types/user'

export interface LoginResult {
  token: string
  user: User
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Backend envelope: { success, message, data: { token_type, token, user }, meta }.
export function parseLoginResponse(response: unknown): LoginResult {
  if (!record(response) || response.success !== true) {
    throw new Error(
      record(response) && typeof response.message === 'string' ? response.message : 'Login failed.',
    )
  }
  const data = response.data
  if (!record(data)) throw new Error('Invalid login response.')
  const token = data.token
  const user = data.user
  if (
    data.token_type !== 'Bearer' ||
    typeof token !== 'string' ||
    !token.trim() ||
    !record(user) ||
    typeof user.id !== 'number' ||
    typeof user.name !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.role !== 'string'
  ) {
    throw new Error('The login response must include a token and user details.')
  }
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
}

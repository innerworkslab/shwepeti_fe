import { apiClient } from './api/client'
import { parseLoginResponse, type LoginResult } from './api/auth-response'
export { parseLoginResponse, type LoginResult } from './api/auth-response'

export interface LoginInput {
  email: string
  password: string
}
export const authService = {
  async login(input: LoginInput): Promise<LoginResult> {
    const response = await apiClient.post<unknown>('/api/v1/admin/login', input)
    return parseLoginResponse(response.data)
  },
  async logout(): Promise<void> {
    await apiClient.post('/api/v1/admin/logout')
  },
}

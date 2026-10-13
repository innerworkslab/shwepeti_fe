import { posApiClient } from './api/pos-client'
import { parseLoginResponse, type LoginResult } from './api/auth-response'
import type { LoginInput } from './auth.service'
export const posAuthService = {
  async logout(): Promise<void> {
    const { data } = await posApiClient.post('/logout')
    if (data?.success === false) throw new Error(data.message || 'Could not log out.')
  },
  async login(input: LoginInput, signal?: AbortSignal): Promise<LoginResult> {
    const response = await posApiClient.post(
      '/login',
      { email: input.email, password: input.password },
      { signal, headers: { Authorization: undefined } },
    )
    return parseLoginResponse(response.data)
  },
}

import { posApiClient } from './api/pos-client'
import { parseLoginResponse, type LoginResult } from './api/auth-response'
import type { LoginInput } from './auth.service'
export const posAuthService = {
  async login(input: LoginInput, signal?: AbortSignal): Promise<LoginResult> {
    const response = await posApiClient.post(
      '/login',
      { email: input.email, password: input.password },
      { signal, headers: { Authorization: undefined } },
    )
    return parseLoginResponse(response.data)
  },
}

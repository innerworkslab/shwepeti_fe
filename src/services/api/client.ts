import axios from 'axios'
import { env } from '@/config/env'
import { toApiError } from './api-error'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  headers: { Accept: 'application/json' },
})

// Set on login/session restoration and clear on logout.
export function setAccessToken(token: string | null): void {
  if (token) apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete apiClient.defaults.headers.common.Authorization
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(axios.isCancel(error) ? error : toApiError(error)),
)

import axios from 'axios'
import { env } from '@/config/env'
import { toApiError } from './api-error'

// A separate instance prevents POS and admin bearer tokens from mixing.
export const posApiClient = axios.create({
  baseURL: env.posApiBaseUrl,
  timeout: env.apiTimeout,
  headers: { Accept: 'application/json' },
})
posApiClient.interceptors.request.use((config) => {
  if (!env.posApiBaseUrl)
    throw new Error(
      'POS login is not configured. Set VITE_POS_API_BASE_URL and restart the application.',
    )
  return config
})
posApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(axios.isCancel(error) ? error : toApiError(error)),
)
export function setPosAccessToken(token: string | null): void {
  if (token) posApiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete posApiClient.defaults.headers.common.Authorization
}

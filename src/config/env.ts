// Backend root only; endpoint prefixes belong to the service methods.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000').replace(
  /\/$/,
  '',
)
const posApiBaseUrl = (import.meta.env.VITE_POS_API_BASE_URL?.trim() || '').replace(/\/+$/, '')
const apiTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 15000)

if (!Number.isFinite(apiTimeout) || apiTimeout <= 0) {
  throw new Error('VITE_API_TIMEOUT must be a positive number of milliseconds.')
}
if (!/^https?:\/\//i.test(apiBaseUrl) && !/^\/(?!\/)/.test(apiBaseUrl)) {
  throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL or a path starting with /.')
}
if (posApiBaseUrl && !/^https?:\/\//i.test(posApiBaseUrl) && !/^\/(?!\/)/.test(posApiBaseUrl)) {
  throw new Error('VITE_POS_API_BASE_URL must be an HTTP(S) URL or a path starting with /.')
}
export const env = Object.freeze({
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'Shwe Petit Admin',
  apiBaseUrl,
  posApiBaseUrl,
  apiTimeout,
})

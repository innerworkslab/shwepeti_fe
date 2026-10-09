import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
const config = vi.hoisted(() => ({
  apiBaseUrl: 'https://admin.example.test',
  posApiBaseUrl: 'https://pos.example.test/api/v1/pos',
  apiTimeout: 15000,
}))
vi.mock('@/config/env', () => ({ env: config }))
import { posApiClient, setPosAccessToken } from '../api/pos-client'
import { apiClient, setAccessToken } from '../api/client'
import { posAuthService } from '../pos-auth.service'
import { usePosSessionStore } from '@/stores/pos-session'
import router from '@/router'
const user = {
  id: 2,
  name: 'POS Staff',
  email: 'pos@example.com',
  role: 'restaurant_administrator',
}
beforeEach(() => {
  sessionStorage.clear()
  setActivePinia(createPinia())
  config.posApiBaseUrl = 'https://pos.example.test/api/v1/pos'
})
afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
  setPosAccessToken(null)
  setAccessToken(null)
})
it('posts exact credentials to the POS base URL plus /login and parses the envelope', async () => {
  const post = vi.spyOn(posApiClient, 'post').mockResolvedValue({
    data: { success: true, data: { token_type: 'Bearer', token: 'pos-test-token', user } },
  })
  const input = { email: 'pos@example.com', password: 'test-password' }
  expect(await posAuthService.login(input)).toEqual({ token: 'pos-test-token', user })
  expect(post).toHaveBeenCalledExactlyOnceWith('/login', input, {
    signal: undefined,
    headers: { Authorization: undefined },
  })
  expect(posApiClient.getUri({ url: '/login' })).toBe('https://pos.example.test/api/v1/pos/login')
})
it('blocks requests when the POS URL placeholder is empty', async () => {
  config.posApiBaseUrl = ''
  const adapter = vi.fn()
  await expect(posApiClient.get('/login', { adapter })).rejects.toMatchObject({
    message: expect.stringContaining('VITE_POS_API_BASE_URL'),
  })
  expect(adapter).not.toHaveBeenCalled()
})
it('persists POS authentication across reloads without changing the admin token', async () => {
  setAccessToken('admin-test-token')
  usePosSessionStore().setSession(user, 'pos-test-token')
  setPosAccessToken(null)
  setActivePinia(createPinia())
  expect(usePosSessionStore().user).toEqual(user)
  expect(posApiClient.defaults.headers.common.Authorization).toBe('Bearer pos-test-token')
  expect(apiClient.defaults.headers.common.Authorization).toBe('Bearer admin-test-token')
  expect(sessionStorage.getItem('shwe-petit.session')).toBeNull()
  usePosSessionStore().clearSession()
  expect(sessionStorage.getItem('shwe-petit.pos-session')).toBeNull()
  expect(apiClient.defaults.headers.common.Authorization).toBe('Bearer admin-test-token')
})
it('allows POS login independently and does not authorize admin routes with a POS session', async () => {
  usePosSessionStore().setSession(user, 'pos-test-token')
  await router.push('/pos/login')
  expect(router.currentRoute.value.name).toBe('pos-login')
  await router.push('/users')
  expect(router.currentRoute.value.name).toBe('login')
})

it('protects the POS calendar using the POS session and preserves deep-link queries', async () => {
  await router.push('/pos?view=calendar')
  expect(router.currentRoute.value.name).toBe('pos-login')
  expect(router.currentRoute.value.query.redirect).toBe('/pos?view=calendar')
  usePosSessionStore().setSession(user, 'pos-test-token')
  await router.push('/pos')
  expect(router.currentRoute.value.name).toBe('pos')
})

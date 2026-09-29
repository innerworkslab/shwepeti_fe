import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { apiClient, setAccessToken } from '../api/client'
import router from '@/router'
const user = {
  id: 1,
  name: 'Administrator',
  email: 'admin@example.com',
  role: 'hotel_administrator',
}
const key = 'shwe-petit.session'
beforeEach(() => {
  sessionStorage.clear()
  setAccessToken(null)
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
  setAccessToken(null)
})
it('restores the user and bearer token before guarding a deep link after reload', async () => {
  useSessionStore().setSession(user, 'test-token')
  // A new store and empty Axios state simulate a fresh application boot.
  setAccessToken(null)
  setActivePinia(createPinia())
  await router.push('/fixed-assets/10/edit')
  expect(router.currentRoute.value.path).toBe('/fixed-assets/10/edit')
  expect(useSessionStore().user).toEqual(user)
  const adapter = vi.fn(async (config) => {
    expect(config.headers.get('Authorization')).toBe('Bearer test-token')
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  })
  await apiClient.get('/api/v1/admin/fixed-assets/10', { adapter })
  expect(adapter).toHaveBeenCalledTimes(1)
})
it('clears persisted credentials on logout so a reload cannot restore them', async () => {
  useSessionStore().setSession(user, 'test-token')
  useSessionStore().clearSession()
  expect(sessionStorage.getItem(key)).toBeNull()
  expect(apiClient.defaults.headers.common.Authorization).toBeUndefined()
  setActivePinia(createPinia())
  await router.push('/items')
  expect(router.currentRoute.value.name).toBe('login')
  expect(useSessionStore().user).toBeNull()
})
it.each([
  'not json',
  'null',
  '{}',
  JSON.stringify({ token: '', user }),
  JSON.stringify({ token: 'test-token', user: { name: 'Incomplete' } }),
])('discards malformed session %s', (stored) => {
  sessionStorage.setItem(key, stored)
  expect(useSessionStore().user).toBeNull()
  expect(sessionStorage.getItem(key)).toBeNull()
  expect(apiClient.defaults.headers.common.Authorization).toBeUndefined()
})
it('stores only the token and basic profile, never a password', () => {
  useSessionStore().setSession(
    { ...user, password: 'must-not-persist' } as typeof user,
    'test-token',
  )
  expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual({ token: 'test-token', user })
})
it('still allows login and logout when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Blocked')
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('Blocked')
  })
  const session = useSessionStore()
  expect(() => session.setSession(user, 'test-token')).not.toThrow()
  expect(session.user).toEqual(user)
  expect(() => session.clearSession()).not.toThrow()
  expect(session.user).toBeNull()
  expect(apiClient.defaults.headers.common.Authorization).toBeUndefined()
})

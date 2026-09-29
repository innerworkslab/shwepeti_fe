import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { authService, parseLoginResponse } from '../auth.service'
import { apiClient } from '../api/client'
import { useSessionStore } from '@/stores/session'
import router from '@/router'

const user = {
  id: 1,
  name: 'Hotel Administrator',
  email: 'admin@example.com',
  role: 'hotel_administrator',
}
const envelope = {
  success: true,
  data: { token_type: 'Bearer', token: 'test-token', user },
  meta: [],
}
afterEach(() => {
  vi.restoreAllMocks()
  delete apiClient.defaults.headers.common.Authorization
})

describe('authentication', () => {
  it('maps the confirmed response envelope and rejects unsuccessful responses', () => {
    expect(parseLoginResponse(envelope)).toEqual({ token: 'test-token', user })
    expect(() => parseLoginResponse({ success: false, message: 'Invalid credentials.' })).toThrow(
      'Invalid credentials.',
    )
    expect(() => parseLoginResponse({ success: true, data: { user } })).toThrow()
  })

  it('posts credentials to login and calls logout without a body', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: envelope })
      .mockResolvedValueOnce({ data: null })
    const credentials = { email: 'admin@example.com', password: 'test-password' }
    expect(await authService.login(credentials)).toEqual({ token: 'test-token', user })
    await authService.logout()
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/login', credentials)
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/logout')
  })

  it('attaches the bearer token to both reads and writes and removes it after logout', async () => {
    setActivePinia(createPinia())
    const session = useSessionStore()
    session.setSession(user, 'test-token')
    const headers: unknown[] = []
    const adapter = vi.fn(async (config) => {
      headers.push(config.headers.get('Authorization'))
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    })
    await apiClient.get('/api/v1/admin/users', { adapter })
    await apiClient.post('/api/v1/admin/room-categories', { name: 'Test' }, { adapter })
    session.clearSession()
    await apiClient.get('/api/v1/admin/users', { adapter })
    expect(headers).toEqual(['Bearer test-token', 'Bearer test-token', undefined])
  })

  it('guards every admin route until a session exists', async () => {
    setActivePinia(createPinia())
    for (const path of [
      '/',
      '/rooms',
      '/users',
      '/room-categories',
      '/item-categories',
      '/unit-groups',
      '/units',
      '/items',
      '/cashbooks',
      '/supplier-ap-balances',
      '/supplier-ap-payments/create',
      '/suppliers/1/ap-ledgers',
      '/asset-categories',
      '/items/create',
      '/items/1/edit',
      '/menus/create',
      '/menus/1/edit',
      '/rooms/create',
      '/rooms/1/edit',
      '/stock-ins/create',
      '/inventory-transfers/create',
      '/inventory-adjustments/create',
      '/fixed-assets',
      '/fixed-assets/create',
      '/fixed-assets/1/edit',
      '/suppliers',
      '/suppliers/create',
      '/suppliers/1/edit',
      '/cashbook-transactions',
      '/inventory-stock-balances',
      '/inventory-ledgers',
      '/menus',
      '/menu-categories',
      '/inventory-adjustments',
      '/inventory-transfers',
      '/stock-ins',
      '/warehouses',
    ]) {
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.query.redirect).toBe(path)
    }
    useSessionStore().setSession(user, 'test-token')
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('users')
    useSessionStore().clearSession()
  })
})

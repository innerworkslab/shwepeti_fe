import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginView from '../LoginView.vue'
import { authService } from '@/services/auth.service'
import { useSessionStore } from '@/stores/session'

vi.mock('@/services/auth.service', () => ({ authService: { login: vi.fn() } }))
const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.resetAllMocks()
  useSessionStore().clearSession()
})
async function render() {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/', component: { template: '<p>Dashboard</p>' }, meta: { requiresAuth: true } },
      { path: '/users', component: { template: '<p>Users</p>' }, meta: { requiresAuth: true } },
    ],
  })
  await router.push('/login?redirect=/users')
  const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })
  wrappers.push(wrapper)
  return { wrapper, router }
}
describe('login form', () => {
  it('validates input and displays server errors without signing in', async () => {
    const { wrapper } = await render()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(authService.login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Email is required.')
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Invalid credentials.'))
    await wrapper.get('[name="email"]').setValue('admin@example.com')
    await wrapper.get('[name="password"]').setValue('test-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Invalid credentials.')
    expect(useSessionStore().user).toBeNull()
  })
  it('stores the authenticated user and returns to the requested protected page', async () => {
    const user = {
      id: 1,
      name: 'Hotel Administrator',
      email: 'admin@example.com',
      role: 'hotel_administrator',
    }
    vi.mocked(authService.login).mockResolvedValueOnce({ token: 'test-token', user })
    const { wrapper, router } = await render()
    await wrapper.get('[name="email"]').setValue('admin@example.com')
    await wrapper.get('[name="password"]').setValue('test-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(authService.login).toHaveBeenCalledExactlyOnceWith({
      email: 'admin@example.com',
      password: 'test-password',
    })
    expect(useSessionStore().user).toEqual(user)
    expect(router.currentRoute.value.path).toBe('/users')
    expect((wrapper.get('[name="password"]').element as HTMLInputElement).value).toBe('')
  })
})

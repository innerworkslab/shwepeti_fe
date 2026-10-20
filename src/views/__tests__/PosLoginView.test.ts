import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import PosLoginView from '../PosLoginView.vue'
import { posAuthService } from '@/services/pos-auth.service'
import { usePosSessionStore } from '@/stores/pos-session'
vi.mock('@/services/pos-auth.service', () => ({ posAuthService: { login: vi.fn() } }))
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  usePosSessionStore().clearSession()
})
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/pos/login', component: PosLoginView },
      {
        path: '/pos',
        component: { template: '<p>POS calendar</p>' },
        meta: { requiresPosAuth: true },
      },
    ],
  })
  await router.push('/pos/login')
  await router.isReady()
  const wrapper = mount(PosLoginView, { global: { plugins: [createPinia(), router] } })
  wrappers.push(wrapper)
  return wrapper
}
it('validates required credentials and displays API errors', async () => {
  const wrapper = await render()
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(posAuthService.login).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Email is required.')
  vi.mocked(posAuthService.login).mockRejectedValueOnce(new Error('Invalid credentials.'))
  await wrapper.get('[name="email"]').setValue('pos@example.com')
  await wrapper.get('[name="password"]').setValue('test-password')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toBe('Invalid credentials.')
  expect(usePosSessionStore().user).toBeNull()
})
it('sends only email/password once and shows a signed-in confirmation', async () => {
  const user = {
    id: 2,
    name: 'POS Staff',
    email: 'pos@example.com',
    role: 'restaurant_administrator',
  }
  let resolve!: (value: { user: typeof user; token: string }) => void
  vi.mocked(posAuthService.login).mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const wrapper = await render()
  await wrapper.get('[name="email"]').setValue('pos@example.com')
  await wrapper.get('[name="password"]').setValue('test-password')
  await wrapper.get('form').trigger('submit')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(posAuthService.login).toHaveBeenCalledExactlyOnceWith(
    { email: 'pos@example.com', password: 'test-password' },
    expect.any(AbortSignal),
  )
  resolve({ user, token: 'pos-test-token' })
  await flushPromises()
  expect(usePosSessionStore().user).toEqual(user)
  expect(wrapper.find('form').exists()).toBe(false)
  expect(wrapper.vm.$router.currentRoute.value.path).toBe('/pos')
})
it('aborts a pending login and ignores its result when leaving', async () => {
  let resolve!: (value: never) => void
  vi.mocked(posAuthService.login).mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const wrapper = await render()
  await wrapper.get('[name="email"]').setValue('pos@example.com')
  await wrapper.get('[name="password"]').setValue('test-password')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  const signal = vi.mocked(posAuthService.login).mock.lastCall?.[1]
  wrapper.unmount()
  expect(signal?.aborted).toBe(true)
  resolve({ user: { id: 2 }, token: 'ignored' } as never)
  await flushPromises()
  expect(usePosSessionStore().user).toBeNull()
})

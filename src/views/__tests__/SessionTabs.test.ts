import { afterEach, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { useSessionStore } from '@/stores/session'
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
it('hides protected content and redirects when another tab logs out', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const session = useSessionStore()
  session.setSession(
    { id: 1, name: 'Admin', email: 'admin@example.com', role: 'hotel_administrator' },
    'test-token',
  )
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/protected',
        meta: { requiresAuth: true },
        component: { template: '<p>Protected content</p>' },
      },
      { path: '/login', name: 'login', component: { template: '<p>Sign in</p>' } },
    ],
  })
  await router.push('/protected')
  const w = mount(App, { global: { plugins: [pinia, router] } })
  try {
    expect(w.text()).toContain('Protected content')
    localStorage.removeItem('shwe-petit.session')
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'shwe-petit.session', storageArea: localStorage }),
    )
    await flushPromises()
    expect(w.text()).not.toContain('Protected content')
    expect(router.currentRoute.value.name).toBe('login')
  } finally {
    w.unmount()
    disposePinia(pinia)
  }
})

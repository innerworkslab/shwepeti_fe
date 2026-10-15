import { cashbookService } from '@/services/cashbook.service'
vi.mock('@/services/cashbook.service', () => ({ cashbookService: { listOptions: vi.fn() } }))
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminLayout from '../AdminLayout.vue'
import { useSessionStore } from '@/stores/session'
import { authService } from '@/services/auth.service'
import { apiClient } from '@/services/api/client'

vi.mock('@/services/auth.service', () => ({ authService: { logout: vi.fn() } }))
const user = {
  id: 1,
  name: 'Hotel Administrator',
  email: 'admin@example.com',
  role: 'hotel_administrator',
}
const wrappers: ReturnType<typeof mount>[] = []
let smallScreen = false

beforeEach(() => {
  vi.mocked(cashbookService.listOptions)
    .mockReset()
    .mockResolvedValue([{ id: 3, name: 'Main Cash', code: 'MAIN', type: 'cash' }])
  localStorage.clear()
  smallScreen = false
  vi.mocked(authService.logout).mockReset().mockResolvedValue(undefined)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: smallScreen,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  useSessionStore().clearSession()
  vi.unstubAllGlobals()
})

async function render() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const session = useSessionStore()
  session.setSession(user, 'test-token')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Dashboard</p>' } },
      { path: '/rooms', component: { template: '<p>Rooms</p>' } },
      { path: '/room-categories', component: { template: '<p>Room categories</p>' } },
      { path: '/item-categories', component: { template: '<p>Item categories</p>' } },
      { path: '/unit-groups', component: { template: '<p>Unit groups</p>' } },
      { path: '/warehouses', component: { template: '<p>Warehouses</p>' } },
      { path: '/stock-ins', component: { template: '<p>Stock In</p>' } },
      { path: '/inventory-transfers', component: { template: '<p>Transfers</p>' } },
      { path: '/inventory-adjustments', component: { template: '<p>Adjustments</p>' } },
      { path: '/menu-categories', component: { template: '<p>Menu categories</p>' } },
      { path: '/menus', component: { template: '<p>Menus</p>' } },
      { path: '/inventory-ledgers', component: { template: '<p>Inventory Ledger</p>' } },
      { path: '/inventory-stock-balances', component: { template: '<p>Stock Balances</p>' } },
      { path: '/cashbook-transactions', component: { template: '<p>Transactions</p>' } },
      { path: '/supplier-ap-balances', component: { template: '<p>Supplier AP</p>' } },
      { path: '/fixed-assets', component: { template: '<p>Fixed Assets</p>' } },
      { path: '/asset-categories', component: { template: '<p>Asset Categories</p>' } },
      { path: '/suppliers', component: { template: '<p>Suppliers</p>' } },
      { path: '/cashbooks', component: { template: '<p>Cashbooks</p>' } },
      { path: '/items', component: { template: '<p>Items</p>' } },
      { path: '/units', component: { template: '<p>Units</p>' } },
      { path: '/users', component: { template: '<p>Users</p>' } },
      { path: '/login', name: 'login', component: { template: '<p>Login</p>' } },
    ],
  })
  await router.push('/users')
  const wrapper = mount(AdminLayout, { global: { plugins: [pinia, router] } })
  wrappers.push(wrapper)
  return { wrapper, router, session }
}

describe('admin navigation', () => {
  it('shows the logo, current user and navigation destinations with icons', async () => {
    const { wrapper } = await render()
    expect(wrapper.get('.brand').text()).toContain('SHWE PETIT')
    expect(wrapper.get('.user-profile').text()).toContain(user.name)
    expect(wrapper.get('.user-profile').text()).toContain('hotel administrator')
    expect(wrapper.findAll('nav .nav-link')).toHaveLength(20)
    expect(wrapper.findAll('nav .nav-link svg')).toHaveLength(21)
    expect(wrapper.get('nav [href="/users"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('nav [href="/users"]').classes()).toContain('is-active')
  })

  it('collapses to accessible icons, persists the preference, and expands again', async () => {
    const { wrapper } = await render()
    await wrapper.get('[aria-label="Collapse sidebar"]').trigger('click')
    expect(wrapper.get('[aria-label="Expand sidebar"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('nav [href="/users"]').attributes('title')).toBe('Users')
    expect(wrapper.get('nav [href="/users"]').text()).toBe('')
    expect(localStorage.getItem('shwe-petit.sidebar-collapsed')).toBe('true')
    await wrapper.get('[aria-label="Expand sidebar"]').trigger('click')
    expect(wrapper.get('nav [href="/users"]').text()).toBe('Users')
  })

  it('opens mobile navigation and closes it with Escape or route changes', async () => {
    smallScreen = true
    const { wrapper, router } = await render()
    await wrapper.get('[aria-label="Expand sidebar"]').trigger('click')
    expect(wrapper.find('.sidebar-backdrop').exists()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('.sidebar-backdrop').exists()).toBe(false)
    await wrapper.get('[aria-label="Expand sidebar"]').trigger('click')
    await router.push('/rooms')
    await flushPromises()
    expect(wrapper.find('.sidebar-backdrop').exists()).toBe(false)
  })

  it('logs out once, clears the bearer token, and goes to login', async () => {
    const { wrapper, router, session } = await render()
    await wrapper.get('.logout-button').trigger('click')
    await flushPromises()
    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(session.user).toBeNull()
    expect(apiClient.defaults.headers.common.Authorization).toBeUndefined()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('keeps the session and offers retry if logout fails', async () => {
    vi.mocked(authService.logout).mockRejectedValueOnce(new Error('Server unavailable.'))
    const { wrapper, session } = await render()
    await wrapper.get('.logout-button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Server unavailable.')
    expect(session.user?.id).toBe(1)
    expect(apiClient.defaults.headers.common.Authorization).toBe('Bearer test-token')
    expect(wrapper.get('.logout-button').attributes('disabled')).toBeUndefined()
  })
})

it('loads cashbooks on expand and links to the selected cashbook ledger', async () => {
  const { wrapper, router } = await render()
  expect(cashbookService.listOptions).not.toHaveBeenCalled()
  await wrapper.get('[aria-controls="cashbook-links"]').trigger('click')
  await flushPromises()
  expect(cashbookService.listOptions).toHaveBeenCalledWith(expect.any(AbortSignal))
  expect(wrapper.get('#cashbook-links').text()).toContain('Main Cash')
  await wrapper
    .get('#cashbook-links a[href="/cashbook-transactions?cashbook_id=3"]')
    .trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query.cashbook_id).toBe('3')
})

import { afterEach, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { hasPermission, routePermission } from './permissions'
import { parseLoginResponse } from '@/services/api/auth-response'
import { installAuthorization, mutationPermission } from '@/services/api/authorization'
import { useSessionStore } from '@/stores/session'
import { usePosSessionStore } from '@/stores/pos-session'
import { usePermissions } from '@/composables/usePermissions'

const user = {
  id: 1,
  name: 'Staff',
  email: 'staff@example.com',
  role: 'hotel_administrator',
  permissions: ['items.view', 'items.create'],
}
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

it('normalizes and retains permissions without granting a role-based bypass', () => {
  const result = parseLoginResponse({
    success: true,
    data: {
      token_type: 'Bearer',
      token: 'test',
      user: { ...user, permissions: ['items.view', null, 'items.view'] },
    },
  })
  expect(result.user.permissions).toEqual(['items.view'])
  expect(hasPermission(result.user.permissions, 'items.update')).toBe(false)
  expect(hasPermission(undefined, 'items.view')).toBe(false)
})

it('persists permissions through restoration and keeps the portals isolated', async () => {
  const first = createPinia()
  setActivePinia(first)
  useSessionStore().setSession(user, 'admin-test')
  usePosSessionStore().setSession({ ...user, permissions: ['bookings.view'] }, 'pos-test')
  disposePinia(first)
  const next = createPinia()
  setActivePinia(next)
  expect(useSessionStore().user?.permissions).toEqual(user.permissions)
  expect(usePosSessionStore().user?.permissions).toEqual(['bookings.view'])
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/items')
  const wrapper = mount(
    {
      setup: () => usePermissions(),
      template: `<button v-if="can('items.create')">Add</button><button v-if="can('items.update')">Edit</button><button v-if="can('bookings.view')">Bookings</button>`,
    },
    { global: { plugins: [next, router] } },
  )
  expect(wrapper.text()).toBe('Add')
  await router.push('/pos/bookings')
  await flushPromises()
  expect(wrapper.text()).toBe('Bookings')
  usePosSessionStore().user!.permissions = []
  await flushPromises()
  expect(wrapper.text()).toBe('')
  wrapper.unmount()
  disposePinia(next)
})

it.each([
  ['/items/create', 'items.create'],
  ['/users/2/edit', 'users.update'],
  ['/suppliers/2/ap-payments', 'supplier_ap_payments.view'],
  ['/suppliers/2/ap-ledgers', 'supplier_ap_ledgers.view'],
  ['/reports/food-sales', 'reports.hotel'],
  ['/reports/profit-and-loss', 'reports.profit_and_loss'],
  ['/pos', 'booking_dashboard.view'],
  ['/pos/cashbook-closings', 'cashbooks.view'],
  ['/fixed-assets/2/depreciations', 'fixed_assets.view'],
])('maps %s to %s', (path, permission) => expect(routePermission(path)).toBe(permission))

it('guards mutations, accepts checkout aliases, and distinguishes create from update', async () => {
  expect(mutationPermission('/api/v1/admin/items', { id: 3 })).toBe('items.update')
  expect(mutationPermission('/food-orders/3/status', {})).toBe('food_orders.update_status')
  expect(mutationPermission('/bookings/3/payments', {})).toBe('bookings.record_payment')
  const form = new FormData()
  form.set('file', new Blob(['sample']))
  expect(mutationPermission('/api/v1/admin/items/import', form)).toBe('items.import')
  const adapter = vi
    .fn()
    .mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} })
  const client = axios.create({ adapter })
  let permissions = ['items.create', 'bookings.check_out']
  installAuthorization(client, () => permissions)
  await client.post('/api/v1/admin/items', { name: 'Test' })
  await client.post('/bookings/3/checkout', { amount: 0 })
  await expect(client.post('/api/v1/admin/items', { id: 3 })).rejects.toThrow('permission')
  permissions = []
  await expect(client.post('/api/v1/admin/items', {})).rejects.toThrow('permission')
  await client.post('/logout')
  expect(adapter).toHaveBeenCalledTimes(3)
})

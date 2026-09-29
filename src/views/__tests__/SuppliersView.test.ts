import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SuppliersView from '../SuppliersView.vue'
import SupplierFormView from '../SupplierFormView.vue'
import { supplierService } from '@/services/supplier.service'
vi.mock('@/services/supplier.service', () => ({
  supplierService: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
const input = {
  supplier_code: 'SUP-001',
  name: 'Hotel Supply Co.',
  phone_number: '09123456789',
  email: 'sales@example.com',
  address: 'Yangon',
  bank_account_no: '00123456789',
  credit_limit_amount: 500000,
  supplier_type: 'wholesale',
  is_active: true,
}
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(supplierService.list).mockResolvedValue({
    data: [{ id: 1, ...input }],
    total: 1,
    page: 1,
    perPage: 15,
  })
  vi.mocked(supplierService.get).mockResolvedValue({ id: 1, ...input })
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})
async function render(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/suppliers', name: 'suppliers', component: SuppliersView },
      { path: '/suppliers/create', component: SupplierFormView },
      { path: '/suppliers/:id/edit', component: SupplierFormView },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
it('lists suppliers and links to standalone create/edit pages', async () => {
  const { wrapper } = await render('/suppliers')
  expect(wrapper.get('tbody').text()).toContain('Hotel Supply Co.')
  expect(wrapper.get('a[href="/suppliers/create"]').text()).toBe('Add supplier')
  expect(wrapper.get('a[href="/suppliers/1/edit"]').text()).toContain('Edit')
  expect(wrapper.get('a[href="/suppliers/1/ap-ledgers"]').text()).toContain('AP ledger')
  expect(wrapper.find('dialog').exists()).toBe(false)
  expect(supplierService.list).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, search: '' }),
    expect.any(AbortSignal),
  )
})
it('validates then creates without ID, preserves leading zeros and returns to list', async () => {
  const { wrapper, router } = await render('/suppliers/create')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(supplierService.create).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Supplier code is required.')
  for (const [key, value] of Object.entries(input)) {
    if (key !== 'is_active') await wrapper.get(`[name="${key}"]`).setValue(String(value))
  }
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(supplierService.create).toHaveBeenCalledExactlyOnceWith(input)
  expect(router.currentRoute.value.path).toBe('/suppliers')
  expect(wrapper.text()).toContain('Supplier created.')
})
it('loads details and sends ID and boolean false on update', async () => {
  const { wrapper } = await render('/suppliers/1/edit')
  expect(supplierService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  expect((wrapper.get('[name="phone_number"]').element as HTMLInputElement).value).toBe(
    '09123456789',
  )
  await wrapper.get('[name="is_active"]').setValue('false')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(supplierService.update).toHaveBeenCalledExactlyOnceWith({
    id: 1,
    ...input,
    is_active: false,
  })
})
it('blocks saving after a detail failure and supports retry', async () => {
  vi.mocked(supplierService.get).mockRejectedValueOnce(new Error('Unavailable'))
  const { wrapper } = await render('/suppliers/1/edit')
  expect(wrapper.text()).toContain('Unavailable')
  expect(wrapper.find('form').exists()).toBe(false)
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.find('form').exists()).toBe(true)
})
it('prevents duplicate submissions while saving and displays API errors', async () => {
  let reject!: (reason: Error) => void
  vi.mocked(supplierService.update).mockReturnValue(
    new Promise((_, fail) => {
      reject = fail
    }),
  )
  const { wrapper } = await render('/suppliers/1/edit')
  await wrapper.get('form').trigger('submit')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(supplierService.update).toHaveBeenCalledTimes(1)
  reject(new Error('Save failed'))
  await flushPromises()
  expect(wrapper.text()).toContain('Save failed')
  expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
})

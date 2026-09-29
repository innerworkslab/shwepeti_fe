import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SupplierApBalancesView from '../SupplierApBalancesView.vue'
import SupplierApLedgersView from '../SupplierApLedgersView.vue'
import SupplierApPaymentFormView from '../SupplierApPaymentFormView.vue'
import { supplierApService } from '@/services/supplier-ap.service'
import { supplierService } from '@/services/supplier.service'
import { cashbookService } from '@/services/cashbook.service'
vi.mock('@/services/supplier-ap.service', () => ({
  supplierApService: { listBalances: vi.fn(), listLedgers: vi.fn(), createPayment: vi.fn() },
}))
vi.mock('@/services/supplier.service', () => ({ supplierService: { listOptions: vi.fn() } }))
vi.mock('@/services/cashbook.service', () => ({ cashbookService: { listOptions: vi.fn() } }))
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(supplierApService.listBalances).mockResolvedValue({
    data: [{ id: 10, supplier_id: 1, balance_amount: '5000.00' }],
    page: 1,
    perPage: 15,
    total: 1,
  })
  vi.mocked(supplierApService.listLedgers).mockResolvedValue({
    data: [{ id: 30, supplier_id: 1, remark: 'Partial settlement' }],
    page: 1,
    perPage: 15,
    total: 30,
  })
  vi.mocked(supplierService.listOptions).mockResolvedValue([
    { id: 1, name: 'Hotel Supply', supplier_code: 'SUP-001' } as never,
  ])
  vi.mocked(cashbookService.listOptions).mockResolvedValue([
    { id: 3, name: 'Main Cash', code: 'CASH', type: 'cash' },
  ])
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})
async function render(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/supplier-ap-balances',
        name: 'supplier-ap-balances',
        component: SupplierApBalancesView,
      },
      { path: '/supplier-ap-payments/create', component: SupplierApPaymentFormView },
      { path: '/suppliers/:id/ap-ledgers', component: SupplierApLedgersView },
      { path: '/suppliers', component: { template: '<p>Suppliers</p>' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
it('shows balances and links to supplier ledger without using balance ID for payments', async () => {
  const { wrapper } = await render('/supplier-ap-balances')
  expect(wrapper.get('tbody').text()).toContain('5000.00')
  expect(wrapper.get('a[href="/suppliers/1/ap-ledgers"]').text()).toContain('AP ledger')
  expect(wrapper.get('a[href="/supplier-ap-payments/create"]').text()).toBe('Add payment')
})
it('scopes ledger requests and refreshes when supplier changes', async () => {
  const { wrapper, router } = await render('/suppliers/1/ap-ledgers')
  expect(supplierApService.listLedgers).toHaveBeenLastCalledWith(
    expect.objectContaining({ supplier_id: 1, page: 1 }),
    expect.any(AbortSignal),
  )
  expect(wrapper.get('tbody').text()).toContain('Partial settlement')
  await router.push('/suppliers/2/ap-ledgers')
  await flushPromises()
  expect(supplierApService.listLedgers).toHaveBeenLastCalledWith(
    expect.objectContaining({ supplier_id: 2, page: 1 }),
    expect.any(AbortSignal),
  )
})
it('validates and creates using dropdown IDs and a local payment date', async () => {
  const { wrapper, router } = await render('/supplier-ap-payments/create')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(supplierApService.createPayment).not.toHaveBeenCalled()
  await wrapper.get('[name="supplier_id"]').setValue('1')
  await wrapper.get('[name="cashbook_id"]').setValue('3')
  await wrapper.get('[name="amount"]').setValue('5000')
  await wrapper.get('[name="payment_date"]').setValue('2026-09-26T23:00:00')
  await wrapper.get('[name="remark"]').setValue('Partial settlement')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(supplierApService.createPayment).toHaveBeenCalledExactlyOnceWith({
    supplier_id: 1,
    cashbook_id: 3,
    amount: 5000,
    payment_date: '2026-09-26 23:00:00',
    remark: 'Partial settlement',
  })
  expect(router.currentRoute.value.path).toBe('/supplier-ap-balances')
})
it('supports retry after dropdown loading fails', async () => {
  vi.mocked(supplierService.listOptions).mockRejectedValueOnce(new Error('Unavailable'))
  const { wrapper } = await render('/supplier-ap-payments/create')
  expect(wrapper.find('form').exists()).toBe(false)
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.find('form').exists()).toBe(true)
})

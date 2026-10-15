import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SupplierApPaymentsView from '../SupplierApPaymentsView.vue'
import { supplierApService } from '@/services/supplier-ap.service'
vi.mock('@/services/supplier-ap.service', () => ({ supplierApService: { listPayments: vi.fn() } }))
afterEach(() => vi.restoreAllMocks())
it('shows payment history and reloads for a different supplier', async () => {
  vi.mocked(supplierApService.listPayments).mockResolvedValue({
    data: [
      {
        id: 1,
        reference_no: 'SAP-001',
        supplier_id: 1,
        cashbook_id: 3,
        amount: '12000.00',
        payment_date: '2026-10-13 16:56:18',
        status: 'draft',
        remark: 'Settlement',
        cashbook: { id: 3, code: 'MAIN', name: 'Main Cash', type: 'cash' },
        creator: { id: 1, name: 'Administrator' },
      },
    ],
    total: 1,
    page: 1,
    perPage: 20,
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/suppliers/:id/ap-payments', component: SupplierApPaymentsView },
      { path: '/supplier-ap-balances', component: { template: '<div />' } },
    ],
  })
  await router.push('/suppliers/1/ap-payments')
  const wrapper = mount(SupplierApPaymentsView, { global: { plugins: [router] } })
  try {
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('SAP-001')
    expect(wrapper.get('tbody').text()).toContain('Main Cash')
    expect(wrapper.get('tbody').text()).toContain('12000.00')
    expect(wrapper.get('tbody').text()).toContain('draft')
    await router.push('/suppliers/2/ap-payments')
    await flushPromises()
    expect(supplierApService.listPayments).toHaveBeenLastCalledWith(
      expect.objectContaining({ supplier_id: 2, page: 1 }),
      expect.any(AbortSignal),
    )
  } finally {
    wrapper.unmount()
  }
})

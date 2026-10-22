import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import View from '../StockInDetailView.vue'
import { stockInService } from '@/services/stock-in.service'
const route = reactive({ params: { id: '1' } })
vi.mock('vue-router', () => ({
  useRoute: () => route,
  RouterLink: { template: '<a><slot /></a>' },
}))
vi.mock('@/services/stock-in.service', () => ({ stockInService: { get: vi.fn() } }))
it('renders totals and nested item details and retries load failures', async () => {
  vi.mocked(stockInService.get)
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValue({
      id: 1,
      reference_no: 'SIN-1',
      warehouse_id: 1,
      transaction_date: '2026-10-20',
      total_amount: '100000.00',
      paid_amount: '50000.00',
      payable_amount: '50000.00',
      cashbook: { id: 1, name: 'Main Cash', opening_balance: '0.00' },
      items: [
        {
          item_id: 1,
          unit_id: 1,
          item: { id: 1, name: 'Chicken' },
          unit: { id: 1, name: 'kg' },
          quantity: '10',
          unit_cost: '10000',
          total_cost: '100000',
          batch_no: 'BAT-1',
        },
      ],
    })
  const w = mount(View)
  try {
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('Unavailable')
    await w.get('button').trigger('click')
    await flushPromises()
    expect(stockInService.get).toHaveBeenLastCalledWith(1, expect.any(AbortSignal))
    expect(w.text()).toContain('100000.00')
    expect(w.text()).toContain('0.00')
    expect(w.get('tbody').text()).toContain('Chicken')
    expect(w.get('tbody').text()).toContain('kg')
    expect(w.get('tbody').text()).toContain('BAT-1')
  } finally {
    w.unmount()
  }
})

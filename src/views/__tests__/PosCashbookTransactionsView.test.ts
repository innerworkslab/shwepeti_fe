import { reactive } from 'vue'
import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import View from '../PosCashbookTransactionsView.vue'
import { posCashbookService } from '@/services/pos-cashbook.service'
const route = reactive({ query: { cashbook_id: '4' } })
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('@/services/pos-cashbook.service', () => ({
  posCashbookService: { transactions: vi.fn() },
}))
it('shows ledger balances and requests the selected cashbook across pagination and navigation', async () => {
  vi.mocked(posCashbookService.transactions).mockImplementation(async (p) => ({
    data: [
      {
        id: 3,
        cashbook_id: p.cashbook_id,
        transaction_type: 'income',
        amount: '83000.00',
        balance_after: '83000.00',
        transaction_date: '2026-10-21',
        remark: 'Booking payment',
      },
    ],
    total: 30,
    page: p.page,
    perPage: 15,
    opening_balance: '0.00',
    closing_balance: '83000.00',
  }))
  const w = mount(View)
  try {
    await flushPromises()
    expect(w.get('[aria-label="Opening balance"] dd').text()).toBe('0.00')
    expect(w.get('[aria-label="Closing balance"] dd').text()).toBe('83000.00')
    expect(w.get('tbody').text()).toContain('Booking payment')
    await w.get('[aria-label="Next page"]').trigger('click')
    await flushPromises()
    expect(posCashbookService.transactions).toHaveBeenLastCalledWith(
      { page: 2, perPage: 15, cashbook_id: 4 },
      expect.any(AbortSignal),
    )
    route.query.cashbook_id = '5'
    await flushPromises()
    expect(posCashbookService.transactions).toHaveBeenLastCalledWith(
      { page: 1, perPage: 15, cashbook_id: 5 },
      expect.any(AbortSignal),
    )
  } finally {
    w.unmount()
  }
})

import { reactive } from 'vue'
const routeState = reactive({ query: {} as Record<string, string> })
vi.mock('vue-router', () => ({ useRoute: () => routeState }))
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CashbookTransactionsView from '../CashbookTransactionsView.vue'
import { cashbookTransactionService } from '@/services/cashbook-transaction.service'
import { cashbookService } from '@/services/cashbook.service'
vi.mock('@/services/cashbook-transaction.service', () => ({
  cashbookTransactionService: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
}))
vi.mock('@/services/cashbook.service', () => ({ cashbookService: { listOptions: vi.fn() } }))
const transaction = {
  id: 7,
  cashbook_id: 3,
  transaction_type: 'income',
  amount: 25000,
  transaction_date: '2026-09-25 09:00:00',
  remark: 'Room payment',
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(CashbookTransactionsView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  routeState.query = {}
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      },
    },
  })
  vi.mocked(cashbookTransactionService.list).mockResolvedValue({
    data: [transaction],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(cashbookTransactionService.get).mockResolvedValue(transaction)
  vi.mocked(cashbookService.listOptions).mockResolvedValue([
    { id: 3, name: 'Main Cash', code: 'MAIN-CASH', type: 'cash' },
  ])
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  for (const key of ['showModal', 'close']) {
    const descriptor = dialogDescriptors[key]
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
  vi.restoreAllMocks()
})

describe('Cashbook transactions', () => {
  it('validates and creates an exact payload, then refreshes', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()
    expect(cashbookTransactionService.create).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').text()).toContain('Choose a cashbook.')
    await wrapper.get('[name="cashbook_id"]').setValue('3')
    await wrapper.get('[name="amount"]').setValue('25000')
    await wrapper.get('[name="transaction_date"]').setValue('2026-09-25T09:00:00')
    await wrapper.get('[name="remark"]').setValue('Room payment')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()
    const { id: _id, ...payload } = transaction
    expect(cashbookTransactionService.create).toHaveBeenCalledExactlyOnceWith(payload)
    expect(cashbookTransactionService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('applies, validates, and clears date filters', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[name="date_from"]').setValue('2026-09-01')
    await wrapper.get('[name="date_to"]').setValue('2026-09-30')
    await wrapper.get('form.date-filters').trigger('submit')
    await flushPromises()
    expect(cashbookTransactionService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, date_from: '2026-09-01', date_to: '2026-09-30' }),
      expect.any(AbortSignal),
    )
    const count = vi.mocked(cashbookTransactionService.list).mock.calls.length
    await wrapper.get('[name="date_from"]').setValue('2026-10-01')
    await wrapper.get('form.date-filters').trigger('submit')
    await flushPromises()
    expect(cashbookTransactionService.list).toHaveBeenCalledTimes(count)
    expect(wrapper.text()).toContain('From date must be on or before')
    await wrapper.get('form.date-filters button[type="button"]').trigger('click')
    await flushPromises()
    expect(cashbookTransactionService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ date_from: undefined, date_to: undefined }),
      expect.any(AbortSignal),
    )
  })
  it('fetches read-only details with retry and no cashbook lookup', async () => {
    vi.mocked(cashbookTransactionService.get).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="View transaction #7"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Unavailable')
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(cashbookTransactionService.get).toHaveBeenLastCalledWith(7, expect.any(AbortSignal))
    expect(wrapper.get('dialog').text()).toContain('Room payment')
    expect(wrapper.find('dialog button[type="submit"]').exists()).toBe(false)
    expect(cashbookService.listOptions).not.toHaveBeenCalled()
  })
})

it('filters by cashbook and keeps dates when switching cashbooks', async () => {
  routeState.query = { cashbook_id: '3' }
  const wrapper = render()
  await flushPromises()
  expect(cashbookTransactionService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ cashbook_id: 3 }),
    expect.any(AbortSignal),
  )
  await wrapper.get('[name="date_from"]').setValue('2026-10-13')
  await wrapper.get('form.date-filters').trigger('submit')
  await flushPromises()
  routeState.query = { cashbook_id: '4' }
  await flushPromises()
  expect(cashbookTransactionService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ cashbook_id: 4, date_from: '2026-10-13', page: 1 }),
    expect.any(AbortSignal),
  )
})

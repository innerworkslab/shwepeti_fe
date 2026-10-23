vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))
import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import View from '../CashbookClosingsView.vue'
const mocks = vi.hoisted(() => ({ list: vi.fn(), close: vi.fn(), options: vi.fn() }))
vi.mock('@/services/cashbook-closing.service', () => ({ cashbookClosings: () => mocks }))
vi.mock('@/services/cashbook.service', () => ({ cashbookService: { listOptions: mocks.options } }))
vi.mock('@/services/pos-cashbook.service', () => ({ posCashbookService: { list: mocks.options } }))
it('selects a cashbook, resets pagination on change and submits the modal', async () => {
  mocks.options.mockResolvedValue([
    { id: 1, name: 'Cash', code: 'CASH' },
    { id: 5, name: 'Bank', code: 'BANK' },
  ])
  mocks.list.mockImplementation(async (_id, p) => ({
    data: [{ id: 1, opening_balance: '0.00', closing_balance: '9830020.00' }],
    page: p.page,
    perPage: 20,
    total: 40,
  }))
  mocks.close.mockResolvedValue(undefined)
  const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() {} },
    close: { configurable: true, value() {} },
  })
  const w = mount(View)
  try {
    await flushPromises()
    expect(mocks.list).toHaveBeenLastCalledWith(
      1,
      { page: 1, perPage: 20 },
      expect.any(AbortSignal),
    )
    expect(w.get('tbody').text()).toContain('9830020.00')
    await w.get('[aria-label="Next page"]').trigger('click')
    await flushPromises()
    await w.get('[name="cashbook_id"]').setValue('5')
    await flushPromises()
    expect(mocks.list).toHaveBeenLastCalledWith(
      5,
      { page: 1, perPage: 20 },
      expect.any(AbortSignal),
    )
    await w.get('button.primary').trigger('click')
    expect(w.get('dialog').text()).toContain('Bank')
    await w.get('dialog form').trigger('submit')
    await flushPromises()
    expect(mocks.close).toHaveBeenCalledExactlyOnceWith({ cashbook_id: 5, remark: 'Daily Closing' })
    expect(mocks.list).toHaveBeenCalledTimes(4)
  } finally {
    w.unmount()
    for (const key of ['showModal', 'close']) {
      const d = descriptors[key]
      if (d) Object.defineProperty(HTMLDialogElement.prototype, key, d)
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
    }
  }
})

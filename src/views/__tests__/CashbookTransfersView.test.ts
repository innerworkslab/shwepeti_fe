import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import View from '../CashbookTransfersView.vue'
const mocks = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), create: vi.fn(), options: vi.fn() }))
vi.mock('@/services/cashbook-transfer.service', () => ({ cashbookTransfers: () => mocks }))
vi.mock('@/services/cashbook.service', () => ({ cashbookService: { listOptions: mocks.options } }))
vi.mock('@/services/pos-cashbook.service', () => ({ posCashbookService: { list: mocks.options } }))
afterEach(() => vi.restoreAllMocks())
it('keeps the request UUID when retrying a failed transfer and refreshes after success', async () => {
  mocks.list.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 15 })
  mocks.options.mockResolvedValue([
    { id: 1, name: 'Cash', code: 'CASH' },
    { id: 5, name: 'Bank', code: 'BANK' },
  ])
  mocks.create.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(undefined)
  const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() {} },
    close: { configurable: true, value() {} },
  })
  const w = mount(View)
  try {
    await flushPromises()
    await w.get('button.primary').trigger('click')
    await w.get('[name="from_cashbook_id"]').setValue('1')
    await w.get('[name="to_cashbook_id"]').setValue('5')
    await w.get('[name="amount"]').setValue('100000.00')
    await w.get('[name="transfer_date"]').setValue('2026-10-22T15:30')
    await w.get('dialog form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Network error')
    const payload = mocks.create.mock.calls[0]![0]
    expect(payload.request_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(payload.transfer_date).toBe('2026-10-22 15:30:00')
    await w.get('dialog form').trigger('submit')
    await flushPromises()
    expect(mocks.create.mock.calls[1]![0]).toEqual(payload)
    expect(mocks.list).toHaveBeenCalledTimes(2)
  } finally {
    w.unmount()
    for (const key of ['showModal', 'close']) {
      const d = descriptors[key]
      if (d) Object.defineProperty(HTMLDialogElement.prototype, key, d)
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
    }
  }
})

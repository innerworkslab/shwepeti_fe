import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { InventoryLedger } from '@/types/inventory-ledger'
import InventoryLedgersView from '../InventoryLedgersView.vue'
import { inventoryLedgerService } from '@/services/inventory-ledger.service'
vi.mock('@/services/inventory-ledger.service', () => ({
  inventoryLedgerService: { list: vi.fn() },
}))
const wrappers: ReturnType<typeof mount>[] = []
function render() {
  const wrapper = mount(InventoryLedgersView)
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.resetAllMocks()
})
it('shows records and pagination without a create button or row actions', async () => {
  vi.mocked(inventoryLedgerService.list).mockImplementation(async (params) => ({
    data: [
      {
        id: 1,
        item_id: 1,
        warehouse_id: 2,
        transaction_type: 'in',
        reference_type: 'stock_in',
        reference_id: 1,
        quantity: '10.000000',
        unit_id: 1,
        base_quantity: '10.000000',
        unit_cost: '5000.000000',
        total_cost: null,
        batch_no: 'BAT-20260915-8D0FB6EA',
        expiry_date: null,
        balance_quantity: '10.000000',
        transaction_date: '2026-09-15 14:47:41',
        remark: null,
        created_by: 1,
        item: { id: 1, name: 'Chicken' },
        warehouse: { id: 2, name: 'Main Warehouse' },
        unit: { id: 1, name: 'kg', symbol: 'kg' },
        creator: { id: 1, name: 'Hotel Administrator' },
      } satisfies InventoryLedger,
    ],
    page: params?.page ?? 1,
    perPage: 15,
    total: 16,
  }))
  const wrapper = render()
  await flushPromises()
  expect(wrapper.get('tbody').text()).toContain('Main Warehouse')
  expect(wrapper.get('tbody').text()).toContain('Chicken')
  expect(wrapper.get('tbody').text()).toContain('10.000000')
  expect(wrapper.get('tbody').text()).toContain('stock_in #1')
  expect(wrapper.get('tbody').text()).toContain('Hotel Administrator')
  expect(wrapper.get('tbody').text()).toContain('BAT-20260915-8D0FB6EA')
  expect(wrapper.get('tbody').text()).toContain('5000.000000')
  expect(wrapper.get('tbody').text()).toContain('—')
  expect(wrapper.get('thead').text()).not.toContain('Actions')
  expect(wrapper.find('tbody button').exists()).toBe(false)
  expect(wrapper.find('button.primary').exists()).toBe(false)
  await wrapper.get('[aria-label="Next page"]').trigger('click')
  await flushPromises()
  expect(inventoryLedgerService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2 }),
    expect.any(AbortSignal),
  )
})
it('shows load errors and retries to the empty state', async () => {
  vi.mocked(inventoryLedgerService.list)
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValue({ data: [], page: 1, perPage: 15, total: 0 })
  const wrapper = render()
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Unavailable')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.get('tbody').text()).toContain('No records found')
})

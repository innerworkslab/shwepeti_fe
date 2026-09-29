import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import StockBalancesView from '../StockBalancesView.vue'
import { stockBalanceService } from '@/services/stock-balance.service'
import { warehouseService } from '@/services/warehouse.service'
import { itemService } from '@/services/item.service'
vi.mock('@/services/stock-balance.service', () => ({ stockBalanceService: { list: vi.fn() } }))
vi.mock('@/services/warehouse.service', () => ({ warehouseService: { listOptions: vi.fn() } }))
vi.mock('@/services/item.service', () => ({ itemService: { listOptions: vi.fn() } }))
const wrappers: ReturnType<typeof mount>[] = []
function render() {
  const wrapper = mount(StockBalancesView)
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(stockBalanceService.list).mockImplementation(async (params) => ({
    data: [{ id: 1, quantity: '0.000000' }],
    page: params?.page ?? 1,
    perPage: 15,
    total: 30,
  }))
  vi.mocked(warehouseService.listOptions).mockResolvedValue([{ id: 2, name: 'Main', code: 'MAIN' }])
  vi.mocked(itemService.listOptions).mockResolvedValue([
    {
      id: 1,
      name: 'Rice',
      code: 'RICE',
      item_category_id: 1,
      stock_unit_id: 1,
      description: null,
      min_stock: 0,
      item_unit_conversions: [],
    },
  ])
})
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))
it('combines filters, resets pagination, preserves filters across pages and clears them', async () => {
  const wrapper = render()
  await flushPromises()
  await wrapper.get('[aria-label="Next page"]').trigger('click')
  await flushPromises()
  await wrapper.get('[name="warehouse_id"]').setValue('2')
  await flushPromises()
  await wrapper.get('[name="item_id"]').setValue('1')
  await flushPromises()
  expect(stockBalanceService.list).toHaveBeenLastCalledWith(
    { page: 1, perPage: 15, warehouse_id: 2, item_id: 1 },
    expect.any(AbortSignal),
  )
  await wrapper.get('[aria-label="Next page"]').trigger('click')
  await flushPromises()
  expect(stockBalanceService.list).toHaveBeenLastCalledWith(
    { page: 2, perPage: 15, warehouse_id: 2, item_id: 1 },
    expect.any(AbortSignal),
  )
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Clear filters')!
    .trigger('click')
  await flushPromises()
  expect(stockBalanceService.list).toHaveBeenLastCalledWith(
    { page: 1, perPage: 15, warehouse_id: undefined, item_id: undefined },
    expect.any(AbortSignal),
  )
  expect(wrapper.get('tbody').text()).toContain('0.000000')
  expect(wrapper.find('tbody button').exists()).toBe(false)
  expect(wrapper.get('thead').text()).not.toContain('Actions')
})
it('retries dropdown failures independently of the table', async () => {
  vi.mocked(warehouseService.listOptions).mockRejectedValueOnce(new Error('Options unavailable'))
  const wrapper = render()
  await flushPromises()
  expect(wrapper.get('[name="warehouse_id"]').attributes('disabled')).toBeDefined()
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.get('[name="warehouse_id"]').text()).toContain('Main')
  expect(stockBalanceService.list).toHaveBeenCalledTimes(1)
})
it('aborts lookup loading on unmount', async () => {
  let done!: (value: []) => void
  vi.mocked(itemService.listOptions).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        done = resolve
      }),
  )
  const wrapper = render()
  const signal = vi.mocked(itemService.listOptions).mock.lastCall?.[0]
  wrapper.unmount()
  wrappers.splice(0)
  expect(signal?.aborted).toBe(true)
  done([])
  await flushPromises()
})

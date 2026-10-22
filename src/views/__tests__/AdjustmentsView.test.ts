import { mountLargeFormFlow } from './mountLargeFormFlow'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdjustmentsView from '../AdjustmentsView.vue'
import { adjustmentService } from '@/services/adjustment.service'
vi.mock('@/services/adjustment.service', () => ({ adjustmentService: { list: vi.fn() } }))
import { transferService } from '@/services/transfer.service'
import { warehouseService } from '@/services/warehouse.service'
import { itemService } from '@/services/item.service'
import { unitService } from '@/services/unit.service'
vi.mock('@/services/transfer.service', () => ({
  transferService: { create: vi.fn(), updateStatus: vi.fn() },
}))
vi.mock('@/services/warehouse.service', () => ({ warehouseService: { listOptions: vi.fn() } }))
vi.mock('@/services/item.service', () => ({ itemService: { listOptions: vi.fn() } }))
vi.mock('@/services/unit.service', () => ({ unitService: { listOptions: vi.fn() } }))
const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
const wrappers: ReturnType<typeof mount>[] = []
async function render() {
  const wrapper = await mountLargeFormFlow(AdjustmentsView, 'inventory-adjustments')
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() {} },
    close: { configurable: true, value() {} },
  })
  vi.mocked(warehouseService.listOptions).mockResolvedValue([
    { id: 2, name: 'Main', code: 'MAIN' },
    { id: 3, name: 'Kitchen', code: 'KITCHEN' },
  ])
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
      units: [
        { id: 1, name: 'Kilogram', symbol: 'kg' },
        { id: 2, name: 'Gram', symbol: 'g' },
      ],
    },
  ])
  vi.mocked(unitService.listOptions).mockResolvedValue([
    { id: 1, name: 'Kilogram', symbol: 'kg', unit_group_id: 1, is_base: true },
  ])
  vi.mocked(transferService.create).mockResolvedValue(undefined)
  vi.mocked(transferService.updateStatus).mockResolvedValue(undefined)
  vi.mocked(adjustmentService.list).mockImplementation(async (params) => ({
    data: [{ id: 1, remark: 'Count correction', status: 'posted' }],
    page: params?.page ?? 1,
    perPage: 20,
    total: 40,
  }))
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  for (const key of ['showModal', 'close']) {
    const descriptor = descriptors[key]
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
})
it('applies dates from page one and retains them across pagination', async () => {
  const wrapper = await render()
  await flushPromises()
  await wrapper.get('[aria-label="Next page"]').trigger('click')
  await flushPromises()
  await wrapper.get('[name="date_from"]').setValue('2026-09-01')
  await wrapper.get('[name="date_to"]').setValue('2026-09-15')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(adjustmentService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, date_from: '2026-09-01', date_to: '2026-09-15' }),
    expect.any(AbortSignal),
  )
  await wrapper.get('[aria-label="Next page"]').trigger('click')
  await flushPromises()
  expect(adjustmentService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2, date_from: '2026-09-01', date_to: '2026-09-15' }),
    expect.any(AbortSignal),
  )
  await wrapper.get('form button[type="button"]').trigger('click')
  await flushPromises()
  expect(adjustmentService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, date_from: undefined, date_to: undefined }),
    expect.any(AbortSignal),
  )
})
it('rejects reversed dates without issuing a request and accepts a single date', async () => {
  const wrapper = await render()
  await flushPromises()
  await wrapper.get('[name="date_from"]').setValue('2026-09-15')
  await wrapper.get('[name="date_to"]').setValue('2026-09-01')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('From date must be on or before')
  expect(adjustmentService.list).toHaveBeenCalledTimes(1)
  await wrapper.get('[name="date_to"]').setValue('')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(adjustmentService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ date_from: '2026-09-15', date_to: undefined }),
    expect.any(AbortSignal),
  )
})

it('creates through the confirmed transfer API flow and refreshes filtered adjustments', async () => {
  const wrapper = await render()
  await flushPromises()
  await wrapper.get('[name="date_from"]').setValue('2026-09-01')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
  expect(wrapper.get('[data-form-surface] :is(h1, h2)').text()).toBe('Add adjustment')
  await wrapper.get('[name="from_warehouse_id"]').setValue('2')
  await wrapper.get('[name="to_warehouse_id"]').setValue('3')
  await wrapper.get('[name="transaction_date"]').setValue('2026-09-15T16:00')
  await wrapper.get('[name="remark"]').setValue('Move rice to kitchen store')
  await wrapper.get('[name="items[0].item_id"]').setValue('1')
  await wrapper.get('[name="items[0].unit_id"]').setValue('1')
  await wrapper.get('[name="items[0].quantity"]').setValue('3')
  await wrapper.get('[name="items[0].expiry_date"]').setValue('2026-12-31')
  await wrapper.get('[data-form-surface] form').trigger('submit')
  await flushPromises()
  expect(transferService.create).toHaveBeenCalledExactlyOnceWith({
    from_warehouse_id: 2,
    to_warehouse_id: 3,
    transaction_date: '2026-09-15 16:00:00',
    remark: 'Move rice to kitchen store',
    items: [{ item_id: 1, unit_id: 1, quantity: 3, expiry_date: '2026-12-31' }],
  })
  expect(adjustmentService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ date_from: '2026-09-01' }),
    expect.any(AbortSignal),
  )
  expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
})
it('posts the selected adjustment ID with only the Posted option', async () => {
  const wrapper = await render()
  await flushPromises()
  await wrapper.get('[aria-label="Update status for adjustment #1"]').trigger('click')
  await flushPromises()
  expect(wrapper.get('[data-form-surface] :is(h1, h2)').text()).toBe('Update adjustment status')
  expect(
    wrapper
      .get('[name="status"]')
      .findAll('option')
      .map((option) => option.attributes('value')),
  ).toEqual(['', 'posted'])
  await wrapper.get('[data-form-surface] form').trigger('submit')
  await flushPromises()
  expect(transferService.updateStatus).toHaveBeenCalledExactlyOnceWith(1, { status: 'posted' })
  expect(adjustmentService.list).toHaveBeenCalledTimes(2)
})

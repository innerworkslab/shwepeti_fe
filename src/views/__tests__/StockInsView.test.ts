import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import StockInsView from '../StockInsView.vue'
import { stockInService } from '@/services/stock-in.service'
vi.mock('@/services/stock-in.service', () => ({
  stockInService: {
    list: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}))
import { warehouseService } from '@/services/warehouse.service'
import { itemService } from '@/services/item.service'
import { unitService } from '@/services/unit.service'
vi.mock('@/services/warehouse.service', () => ({ warehouseService: { listOptions: vi.fn() } }))
vi.mock('@/services/item.service', () => ({ itemService: { listOptions: vi.fn() } }))
vi.mock('@/services/unit.service', () => ({ unitService: { listOptions: vi.fn() } }))
const group = {
  id: 7,
  warehouse_id: 2,
  transaction_date: '2026-09-15 14:47:41',
  status: 'draft',
  warehouse: { id: 2, name: 'Kitchen Warehouse' },
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(StockInsView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(warehouseService.listOptions).mockResolvedValue([
    { id: 2, name: 'Kitchen Warehouse', code: 'KITCHEN' },
  ])
  vi.mocked(itemService.listOptions).mockResolvedValue([
    {
      id: 1,
      name: 'Chicken',
      code: 'CHICKEN',
      item_category_id: 1,
      stock_unit_id: 1,
      description: null,
      min_stock: 0,
      item_unit_conversions: [],
    },
  ])
  vi.mocked(unitService.listOptions).mockResolvedValue([
    { id: 1, name: 'Kilogram', symbol: 'kg', unit_group_id: 1, is_base: true },
  ])
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
  vi.mocked(stockInService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(stockInService.create).mockResolvedValue(undefined)
  vi.mocked(stockInService.updateStatus).mockResolvedValue(undefined)
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

async function fill(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[name="warehouse_id"]').setValue('2')
  await wrapper.get('[name="transaction_date"]').setValue('2026-09-15T14:47:41')
  await wrapper.get('[name="items[0].item_id"]').setValue('1')
  await wrapper.get('[name="items[0].unit_id"]').setValue('1')
  await wrapper.get('[name="items[0].quantity"]').setValue('10')
  await wrapper.get('[name="items[0].unit_cost"]').setValue('5000')
}
describe('Stock In', () => {
  it('validates required fields and creates the supplied payload, then refreshes', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Kitchen Warehouse')
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(stockInService.create).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').text()).toContain('Choose a warehouse.')
    await fill(wrapper)
    await wrapper.get('[name="items[0].quantity"]').setValue('0')
    await wrapper.get('[name="items[0].unit_cost"]').setValue('-1')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Quantity must be greater than zero.')
    expect(wrapper.get('dialog').text()).toContain('Unit cost cannot be negative.')
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(stockInService.create).toHaveBeenCalledExactlyOnceWith({
      warehouse_id: 2,
      transaction_date: '2026-09-15 14:47:41',
      items: [{ item_id: 1, unit_id: 1, quantity: 10, unit_cost: 5000 }],
    })
    expect(stockInService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('supports adding and removing lines and requires at least one', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await fill(wrapper)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add item')!
      .trigger('click')
    await wrapper.get('[name="items[1].item_id"]').setValue('1')
    await wrapper.get('[name="items[1].unit_id"]').setValue('1')
    await wrapper.get('[name="items[1].quantity"]').setValue('2.5')
    await wrapper.get('[name="items[1].unit_cost"]').setValue('0')
    await wrapper.get('[aria-label="Remove item 1"]').trigger('click')
    expect((wrapper.get('[name="items[0].quantity"]').element as HTMLInputElement).value).toBe(
      '2.5',
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(stockInService.create).toHaveBeenCalledWith(
      expect.objectContaining({ items: [{ item_id: 1, unit_id: 1, quantity: 2.5, unit_cost: 0 }] }),
    )
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="Remove item 1"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Add at least one item.')
    expect(stockInService.create).toHaveBeenCalledTimes(1)
  })
  it.each(['posted', 'cancelled'])(
    'updates status to %s without loading lookups',
    async (status) => {
      const wrapper = render()
      await flushPromises()
      await wrapper.get('[aria-label="Update status for stock in #7"]').trigger('click')
      await flushPromises()
      expect(wrapper.get('dialog').text()).toContain('Stock in #7')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(stockInService.updateStatus).not.toHaveBeenCalled()
      await wrapper.get('[name="status"]').setValue(status)
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(stockInService.updateStatus).toHaveBeenCalledExactlyOnceWith(7, { status })
      expect(warehouseService.listOptions).not.toHaveBeenCalled()
      expect(itemService.listOptions).not.toHaveBeenCalled()
      expect(unitService.listOptions).not.toHaveBeenCalled()
      expect(stockInService.list).toHaveBeenCalledTimes(2)
    },
  )
  it('blocks submission after lookup failure and retries', async () => {
    vi.mocked(warehouseService.listOptions).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[name="warehouse_id"]').text()).toContain('Kitchen Warehouse')
  })
  it('preserves fields on save failure and prevents duplicate creation', async () => {
    vi.mocked(stockInService.create).mockRejectedValueOnce(new Error('Save failed'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Save failed')
    expect((wrapper.get('[name="items[0].quantity"]').element as HTMLInputElement).value).toBe('10')
    let done!: () => void
    vi.mocked(stockInService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(stockInService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('aborts outstanding option requests when dismissed', async () => {
    let done!: (value: []) => void
    vi.mocked(warehouseService.listOptions).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    const signal = vi.mocked(warehouseService.listOptions).mock.lastCall?.[0]
    await wrapper.get('dialog').trigger('cancel')
    expect(signal?.aborted).toBe(true)
    done([])
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})

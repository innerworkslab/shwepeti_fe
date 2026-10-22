import { mountLargeFormFlow } from './mountLargeFormFlow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TransfersView from '../TransfersView.vue'
import { transferService } from '@/services/transfer.service'
vi.mock('@/services/transfer.service', () => ({
  transferService: {
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
  from_warehouse_id: 2,
  to_warehouse_id: 3,
  remark: 'Move rice to kitchen store',
  transaction_date: '2026-09-15 14:47:41',
  status: 'draft',
  from_warehouse: { id: 2, name: 'Kitchen Warehouse' },
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
async function render() {
  const wrapper = await mountLargeFormFlow(TransfersView, 'inventory-transfers')
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(warehouseService.listOptions).mockResolvedValue([
    { id: 2, name: 'Kitchen Warehouse', code: 'KITCHEN' },
    { id: 3, name: 'Main Warehouse', code: 'MAIN' },
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
      units: [
        { id: 1, name: 'Kilogram', symbol: 'kg' },
        { id: 2, name: 'Gram', symbol: 'g' },
      ],
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
  vi.mocked(transferService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(transferService.create).mockResolvedValue(undefined)
  vi.mocked(transferService.updateStatus).mockResolvedValue(undefined)
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
  await wrapper.get('[name="from_warehouse_id"]').setValue('2')
  await wrapper.get('[name="to_warehouse_id"]').setValue('3')
  await wrapper.get('[name="remark"]').setValue('Move rice to kitchen store')
  await wrapper.get('[name="transaction_date"]').setValue('2026-09-15T14:47:41')
  await wrapper.get('[name="items[0].item_id"]').setValue('1')
  await wrapper.get('[name="items[0].unit_id"]').setValue('1')
  await wrapper.get('[name="items[0].quantity"]').setValue('10')
  await wrapper.get('[name="items[0].expiry_date"]').setValue('2026-12-31')
}
describe('Transfers', () => {
  it('validates required fields and creates the supplied payload, then refreshes', async () => {
    const wrapper = await render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Kitchen Warehouse')
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.get('[data-form-surface]').classes()).toContain('form-page')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(transferService.create).not.toHaveBeenCalled()
    expect(wrapper.get('[data-form-surface]').text()).toContain('Choose a source warehouse.')
    await fill(wrapper)
    await wrapper.get('[name="items[0].quantity"]').setValue('0')
    await wrapper.get('[name="items[0].expiry_date"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface]').text()).toContain(
      'Quantity must be greater than zero.',
    )
    expect(wrapper.get('[data-form-surface]').text()).toContain('Expiry date is required.')
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(transferService.create).toHaveBeenCalledExactlyOnceWith({
      from_warehouse_id: 2,
      to_warehouse_id: 3,
      remark: 'Move rice to kitchen store',
      transaction_date: '2026-09-15 14:47:41',
      items: [{ item_id: 1, unit_id: 1, quantity: 10, expiry_date: '2026-12-31' }],
    })
    expect(transferService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })
  it('supports adding and removing lines and requires at least one', async () => {
    const wrapper = await render()
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
    await wrapper.get('[name="items[1].expiry_date"]').setValue('2027-01-01')
    await wrapper.get('[aria-label="Remove item 1"]').trigger('click')
    expect((wrapper.get('[name="items[0].quantity"]').element as HTMLInputElement).value).toBe(
      '2.5',
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(transferService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ item_id: 1, unit_id: 1, quantity: 2.5, expiry_date: '2027-01-01' }],
      }),
    )
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="Remove item 1"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface]').text()).toContain('Add at least one item.')
    expect(transferService.create).toHaveBeenCalledTimes(1)
  })
  it.each(['posted'])('updates status to %s without loading lookups', async (status) => {
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for transfer #7"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-form-surface]').text()).toContain('Transfer #7')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(transferService.updateStatus).not.toHaveBeenCalled()
    expect(
      wrapper
        .get('[name="status"]')
        .findAll('option')
        .map((option) => option.attributes('value')),
    ).toEqual(['', 'posted'])
    await wrapper.get('[name="status"]').setValue(status)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(transferService.updateStatus).toHaveBeenCalledExactlyOnceWith(7, { status })
    expect(warehouseService.listOptions).not.toHaveBeenCalled()
    expect(itemService.listOptions).not.toHaveBeenCalled()
    expect(unitService.listOptions).not.toHaveBeenCalled()
    expect(transferService.list).toHaveBeenCalledTimes(2)
  })
  it('rejects matching source and destination warehouses', async () => {
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await fill(wrapper)
    await wrapper.get('[name="to_warehouse_id"]').setValue('2')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface]').text()).toContain(
      'Choose a different destination warehouse.',
    )
    expect(transferService.create).not.toHaveBeenCalled()
  })
  it('blocks submission after lookup failure and retries', async () => {
    vi.mocked(warehouseService.listOptions).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-form-surface] [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[name="from_warehouse_id"]').text()).toContain('Kitchen Warehouse')
  })
  it('preserves fields on save failure and prevents duplicate creation', async () => {
    vi.mocked(transferService.create).mockRejectedValueOnce(new Error('Save failed'))
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface] [role="alert"]').text()).toBe('Save failed')
    expect((wrapper.get('[name="items[0].quantity"]').element as HTMLInputElement).value).toBe('10')
    let done!: () => void
    vi.mocked(transferService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('[data-form-surface]').trigger('cancel')
    await flushPromises()
    expect(transferService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-form-surface]').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })
  it('aborts outstanding option requests when dismissed', async () => {
    let done!: (value: []) => void
    vi.mocked(warehouseService.listOptions).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    const signal = vi.mocked(warehouseService.listOptions).mock.lastCall?.[0]
    await wrapper.get('[data-form-surface]').trigger('cancel')
    await flushPromises()
    expect(signal?.aborted).toBe(true)
    done([])
    await flushPromises()
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })
})

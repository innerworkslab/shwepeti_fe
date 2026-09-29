import { mountLargeFormFlow } from './mountLargeFormFlow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ItemsView from '../ItemsView.vue'
import { itemCategoryService } from '@/services/item-category.service'
vi.mock('@/services/item-category.service', () => ({
  itemCategoryService: { listOptions: vi.fn() },
}))
import { itemService } from '@/services/item.service'
vi.mock('@/services/item.service', () => ({
  itemService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
    updatePrice: vi.fn(),
  },
}))
import { unitService } from '@/services/unit.service'
vi.mock('@/services/unit.service', () => ({ unitService: { listOptions: vi.fn() } }))
const group = {
  id: 1,
  name: 'Chicken',
  code: 'CHICKEN',
  item_category_id: 1,
  stock_unit_id: 1,
  description: 'Raw chicken stock',
  min_stock: 10.5,
  price: 2000,
  is_active: true,
  item_unit_conversions: [{ from_unit_id: 1, to_unit_id: 2, conversion_factor: 1000 }],
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
async function render() {
  const wrapper = await mountLargeFormFlow(ItemsView, 'items')
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(unitService.listOptions).mockResolvedValue([
    { id: 1, name: 'Kilogram', symbol: 'kg', unit_group_id: 1, is_base: true },
    { id: 2, name: 'Gram', symbol: 'g', unit_group_id: 1, is_base: false },
  ])
  vi.mocked(itemService.updatePrice).mockResolvedValue(undefined)
  vi.mocked(itemCategoryService.listOptions).mockResolvedValue([
    { id: 1, name: 'Food', parent_id: null, code: 'FOOD', description: null },
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
  vi.mocked(itemService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(itemService.get).mockResolvedValue(group)
  vi.mocked(itemService.create).mockResolvedValue(undefined)
  vi.mocked(itemService.update).mockResolvedValue(undefined)
  vi.mocked(itemService.toggleActive).mockResolvedValue(undefined)
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

describe('Items', () => {
  it('validates required fields and conversions, creates without ID, and refreshes', async () => {
    const wrapper = await render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Chicken')
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.get('[data-form-surface]').classes()).toContain('form-page')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface]').text()).toContain('Name is required.')
    expect(itemService.create).not.toHaveBeenCalled()
    await wrapper.get('[name="name"]').setValue(' Chicken ')
    await wrapper.get('[name="code"]').setValue(' CHICKEN ')
    await wrapper.get('[name="item_category_id"]').setValue('1')
    await wrapper.get('[name="stock_unit_id"]').setValue('1')
    await wrapper.get('[name="min_stock"]').setValue('10.5')
    await wrapper.get('[name="description"]').setValue('Raw chicken stock')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add conversion')!
      .trigger('click')
    await wrapper.get('[name="item_unit_conversions[0].from_unit_id"]').setValue('1')
    await wrapper.get('[name="item_unit_conversions[0].to_unit_id"]').setValue('2')
    await wrapper.get('[name="item_unit_conversions[0].conversion_factor"]').setValue('0')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemService.create).not.toHaveBeenCalled()
    expect(wrapper.get('[data-form-surface]').text()).toContain(
      'Conversion factor must be greater than zero.',
    )
    await wrapper.get('[name="item_unit_conversions[0].conversion_factor"]').setValue('1000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const { id, price, is_active, ...input } = group
    expect(itemService.create).toHaveBeenCalledExactlyOnceWith(input)
    expect(itemService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })
  it('loads fresh details and allows removing conversions on update', async () => {
    vi.mocked(itemService.get).mockResolvedValueOnce({ ...group, name: 'Fresh chicken' })
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Chicken"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh chicken')
    await wrapper.get('[aria-label="Remove conversion 1"]').trigger('click')
    await wrapper.get('[name="description"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const { price, is_active, ...input } = group
    expect(itemService.update).toHaveBeenCalledExactlyOnceWith({
      ...input,
      name: 'Fresh chicken',
      description: null,
      item_unit_conversions: [],
    })
  })
  it.each([true, false])(
    'updates status with boolean %s without loading dropdowns',
    async (status) => {
      const wrapper = await render()
      await flushPromises()
      await wrapper.get('[aria-label="Update status for Chicken"]').trigger('click')
      await flushPromises()
      expect(wrapper.get('[data-form-surface]').text()).toContain('ID 1')
      await wrapper.get('[name="is_active"]').setValue(String(status))
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(itemService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, { is_active: status })
      expect(unitService.listOptions).not.toHaveBeenCalled()
      expect(itemService.update).not.toHaveBeenCalled()
    },
  )
  it('validates price and sends only item_id and price', async () => {
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Update price for Chicken"]').trigger('click')
    await flushPromises()
    await wrapper.get('[name="price"]').setValue('-1')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemService.updatePrice).not.toHaveBeenCalled()
    expect(wrapper.get('[data-form-surface]').text()).toContain('Price cannot be negative.')
    await wrapper.get('[name="price"]').setValue('2500')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemService.updatePrice).toHaveBeenCalledExactlyOnceWith({ item_id: 1, price: 2500 })
    expect(itemService.update).not.toHaveBeenCalled()
    expect(itemService.list).toHaveBeenCalledTimes(2)
    expect(unitService.listOptions).not.toHaveBeenCalled()
  })
  it('blocks saving on lookup failure, retries, and preserves missing options', async () => {
    vi.mocked(unitService.listOptions)
      .mockRejectedValueOnce(new Error('Units unavailable'))
      .mockResolvedValueOnce([])
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Chicken"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-form-surface] [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[name="stock_unit_id"]').text()).toContain('Unit #1 (not in list)')
    expect(wrapper.get('[name="item_unit_conversions[0].to_unit_id"]').text()).toContain(
      'Unit #2 (not in list)',
    )
  })
  it('preserves price on save failure and prevents duplicate submissions', async () => {
    vi.mocked(itemService.updatePrice).mockRejectedValueOnce(new Error('Save failed'))
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Update price for Chicken"]').trigger('click')
    await flushPromises()
    await wrapper.get('[name="price"]').setValue('2500')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface] [role="alert"]').text()).toBe('Save failed')
    expect((wrapper.get('[name="price"]').element as HTMLInputElement).value).toBe('2500')
    let done!: () => void
    vi.mocked(itemService.updatePrice).mockImplementationOnce(
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
    expect(itemService.updatePrice).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-form-surface]').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })
  it('aborts loading when dismissed', async () => {
    let done!: (value: typeof group) => void
    vi.mocked(itemService.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Chicken"]').trigger('click')
    await flushPromises()
    const signal = vi.mocked(itemService.get).mock.lastCall?.[1]
    await wrapper.get('[data-form-surface]').trigger('cancel')
    await flushPromises()
    expect(signal?.aborted).toBe(true)
    done(group)
    await flushPromises()
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })
})

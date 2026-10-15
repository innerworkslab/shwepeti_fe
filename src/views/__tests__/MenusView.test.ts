import { warehouseService } from '@/services/warehouse.service'
vi.mock('@/services/warehouse.service', () => ({ warehouseService: { listOptions: vi.fn() } }))
import { mountLargeFormFlow } from './mountLargeFormFlow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MenusView from '../MenusView.vue'
import { menuCategoryService } from '@/services/menu-category.service'
vi.mock('@/services/menu-category.service', () => ({
  menuCategoryService: { listOptions: vi.fn() },
}))
import { menuService } from '@/services/menu.service'
vi.mock('@/services/menu.service', () => ({
  menuService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
    toggleAvailable: vi.fn(),
  },
}))
import { unitService } from '@/services/unit.service'
vi.mock('@/services/unit.service', () => ({ unitService: { listOptions: vi.fn() } }))
import { itemService } from '@/services/item.service'
vi.mock('@/services/item.service', () => ({ itemService: { listOptions: vi.fn() } }))
const group = {
  id: 1,
  warehouse_id: 2,
  menu_category_id: 1,
  name: 'Fried Rice',
  code: 'RICE',
  description: 'Lunch',
  price: 4500,
  cost_price: null,
  image_url: null,
  is_active: true,
  is_available: true,
  recipes: [{ item_id: 1, unit_id: 2, quantity: 150, remark: 'Chicken portion' }],
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
async function render() {
  const wrapper = await mountLargeFormFlow(MenusView, 'menus')
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(warehouseService.listOptions).mockResolvedValue([
    { id: 2, name: 'Kitchen', code: 'KITCHEN' },
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
    { id: 2, name: 'Gram', symbol: 'g', unit_group_id: 1, is_base: false },
  ])
  vi.mocked(menuService.toggleAvailable).mockResolvedValue(undefined)
  vi.mocked(menuCategoryService.listOptions).mockResolvedValue([
    { id: 1, name: 'Food', code: 'FOOD', description: '', sort_order: 0 },
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
  vi.mocked(menuService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(menuService.get).mockResolvedValue(group)
  vi.mocked(menuService.create).mockResolvedValue(undefined)
  vi.mocked(menuService.update).mockResolvedValue(undefined)
  vi.mocked(menuService.toggleActive).mockResolvedValue(undefined)
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

async function openCreate(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
  await wrapper.get('[name="warehouse_id"]').setValue('2')
  await wrapper.get('[name="menu_category_id"]').setValue('1')
  await wrapper.get('[name="name"]').setValue('Fried Rice')
  await wrapper.get('[name="code"]').setValue('RICE')
  await wrapper.get('[name="description"]').setValue('Lunch')
  await wrapper.get('[name="price"]').setValue('4500')
}
describe('Menus', () => {
  it('defaults to active and supports inactive and all filters', async () => {
    const wrapper = await render()
    await flushPromises()
    expect(menuService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ is_active: 1, page: 1 }),
      expect.any(AbortSignal),
    )
    await wrapper.get('[name="is_active_filter"]').setValue('0')
    await flushPromises()
    expect(menuService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ is_active: 0, page: 1 }),
      expect.any(AbortSignal),
    )
    await wrapper.get('[name="is_active_filter"]').setValue('')
    await flushPromises()
    expect(menuService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ is_active: undefined }),
      expect.any(AbortSignal),
    )
  })
  it('creates with nullable cost/image and validated recipe rows', async () => {
    const wrapper = await render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add ingredient')!
      .trigger('click')
    await wrapper.get('[name="recipes[0].item_id"]').setValue('1')
    await wrapper.get('[name="recipes[0].unit_id"]').setValue('2')
    await wrapper.get('[name="recipes[0].quantity"]').setValue('0')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(menuService.create).not.toHaveBeenCalled()
    expect(wrapper.get('[data-form-surface]').text()).toContain(
      'Quantity must be greater than zero.',
    )
    await wrapper.get('[name="recipes[0].quantity"]').setValue('150')
    await wrapper.get('[name="recipes[0].remark"]').setValue('Chicken portion')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const { id, is_active, is_available, ...input } = group
    expect(menuService.create).toHaveBeenCalledExactlyOnceWith(input)
    expect(menuService.list).toHaveBeenCalledTimes(2)
  })
  it('loads fresh details, removes recipes, and updates with ID', async () => {
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Fried Rice"]').trigger('click')
    await flushPromises()
    expect(menuService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    await wrapper.get('[aria-label="Remove ingredient 1"]').trigger('click')
    await wrapper.get('[name="cost_price"]').setValue('0')
    await wrapper.get('[name="image_url"]').setValue('https://example.com/rice.jpg')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const { is_active, is_available, ...input } = group
    expect(menuService.update).toHaveBeenCalledExactlyOnceWith({
      ...input,
      recipes: [],
      cost_price: 0,
      image_url: 'https://example.com/rice.jpg',
    })
  })
  it.each([true, false])('updates active status independently to %s', async (value) => {
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Fried Rice"]').trigger('click')
    await flushPromises()
    await wrapper.get('[name="is_active"]').setValue(String(value))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(menuService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, { is_active: value })
    expect(menuService.toggleAvailable).not.toHaveBeenCalled()
    expect(menuCategoryService.listOptions).not.toHaveBeenCalled()
  })
  it.each([true, false])('updates availability independently to %s', async (value) => {
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Update availability for Fried Rice"]').trigger('click')
    await flushPromises()
    await wrapper.get('[name="is_available"]').setValue(String(value))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(menuService.toggleAvailable).toHaveBeenCalledExactlyOnceWith(1, { is_available: value })
    expect(menuService.toggleActive).not.toHaveBeenCalled()
  })
  it('retries failed detail loading and preserves missing recipe options', async () => {
    vi.mocked(menuService.get).mockRejectedValueOnce(new Error('Unavailable'))
    vi.mocked(itemService.listOptions).mockResolvedValue([])
    const wrapper = await render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Fried Rice"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-form-surface] [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[name="recipes[0].item_id"]').text()).toContain('Item #1 (not in list)')
  })
  it('retains input after save failure and prevents duplicate requests', async () => {
    vi.mocked(menuService.create).mockRejectedValueOnce(new Error('Save failed'))
    const wrapper = await render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface] [role="alert"]').text()).toBe('Save failed')
    let done!: () => void
    vi.mocked(menuService.create).mockImplementationOnce(
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
    expect(menuService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-form-surface]').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })
})

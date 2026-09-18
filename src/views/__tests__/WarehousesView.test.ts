import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import WarehousesView from '../WarehousesView.vue'
import { warehouseService } from '@/services/warehouse.service'
vi.mock('@/services/warehouse.service', () => ({
  warehouseService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
  },
}))
const group = { id: 1, name: 'Kitchen Warehouse', code: 'KITCHEN', is_active: false }
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(WarehousesView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
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
  vi.mocked(warehouseService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(warehouseService.get).mockResolvedValue(group)
  vi.mocked(warehouseService.create).mockResolvedValue(undefined)
  vi.mocked(warehouseService.update).mockResolvedValue(undefined)
  vi.mocked(warehouseService.toggleActive).mockResolvedValue(undefined)
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

describe('Warehouses', () => {
  it('validates a name, creates without ID, and refreshes the table', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Kitchen Warehouse')
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="id"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Name is required.')
    expect(wrapper.get('dialog').text()).toContain('Code is required.')
    expect(warehouseService.create).not.toHaveBeenCalled()
    await wrapper.get('[name="name"]').setValue(' Weight ')
    await wrapper.get('[name="code"]').setValue(' KITCHEN ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(warehouseService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Weight',
      code: 'KITCHEN',
    })
    expect(warehouseService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('loads fresh details and updates only ID, name, and code', async () => {
    vi.mocked(warehouseService.get).mockResolvedValueOnce({ ...group, name: 'Fresh group' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen Warehouse"]').trigger('click')
    await flushPromises()
    expect(warehouseService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh group')
    expect(wrapper.find('[name="is_active"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('[name="code"]').setValue('KITCHEN')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(warehouseService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      name: 'Weight',
      code: 'KITCHEN',
    })
  })
  it.each([true, false])('sends boolean %s from the status modal', async (status) => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Kitchen Warehouse"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('ID 1')
    await wrapper.get('[name="is_active"]').setValue(String(status))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(warehouseService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, { is_active: status })
    expect(warehouseService.update).not.toHaveBeenCalled()
    expect(warehouseService.list).toHaveBeenCalledTimes(2)
  })
  it('requires a status when the API omits it', async () => {
    vi.mocked(warehouseService.get).mockResolvedValueOnce({
      id: 1,
      name: 'Kitchen Warehouse',
      code: 'KITCHEN',
    })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Kitchen Warehouse"]').trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Choose the warehouse status.')
    expect(warehouseService.toggleActive).not.toHaveBeenCalled()
  })
  it('blocks saving after a detail failure and retries loading', async () => {
    vi.mocked(warehouseService.get).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen Warehouse"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="name"]').exists()).toBe(true)
  })
  it('preserves input on save failure and prevents duplicate submissions', async () => {
    vi.mocked(warehouseService.create).mockRejectedValueOnce(new Error('Save failed'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('[name="code"]').setValue('KITCHEN')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Save failed')
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Weight')
    let done!: () => void
    vi.mocked(warehouseService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(warehouseService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('aborts detail loading on dismissal', async () => {
    let done!: (value: typeof group) => void
    vi.mocked(warehouseService.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen Warehouse"]').trigger('click')
    const signal = vi.mocked(warehouseService.get).mock.lastCall?.[1]
    await wrapper.get('dialog').trigger('cancel')
    expect(signal?.aborted).toBe(true)
    done(group)
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})

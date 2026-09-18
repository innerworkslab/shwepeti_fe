import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import UnitsView from '../UnitsView.vue'
import { unitGroupService } from '@/services/unit-group.service'
vi.mock('@/services/unit-group.service', () => ({ unitGroupService: { listOptions: vi.fn() } }))
import { unitService } from '@/services/unit.service'
vi.mock('@/services/unit.service', () => ({
  unitService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
  },
}))
const group = {
  id: 1,
  unit_group_id: 5,
  name: 'ton',
  symbol: 't',
  is_base: false,
  is_active: false,
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(UnitsView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(unitGroupService.listOptions).mockResolvedValue([{ id: 5, name: 'Weight' }])
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
  vi.mocked(unitService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(unitService.get).mockResolvedValue(group)
  vi.mocked(unitService.create).mockResolvedValue(undefined)
  vi.mocked(unitService.update).mockResolvedValue(undefined)
  vi.mocked(unitService.toggleActive).mockResolvedValue(undefined)
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

describe('Units', () => {
  it('shows dropdown load failures and retries, preserving an existing missing group', async () => {
    vi.mocked(unitGroupService.listOptions)
      .mockRejectedValueOnce(new Error('Groups unavailable.'))
      .mockResolvedValueOnce([])
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit ton"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toContain('Groups unavailable.')
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[name="unit_group_id"]').text()).toContain('Group #5 (not in list)')
    expect((wrapper.get('[name="unit_group_id"]').element as HTMLSelectElement).value).toBe('5')
  })

  it('validates a name, creates without ID, and refreshes the table', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('ton')
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="id"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Name is required.')
    expect(unitService.create).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').text()).toContain('Symbol is required.')
    expect(wrapper.get('dialog').text()).toContain('Choose a unit group.')
    await wrapper.get('[name="name"]').setValue(' Weight ')
    await wrapper.get('[name="symbol"]').setValue(' t ')
    await wrapper.get('[name="unit_group_id"]').setValue('5')
    await wrapper.get('[name="is_base"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(unitService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Weight',
      symbol: 't',
      unit_group_id: 5,
      is_base: true,
    })
    expect(unitService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('loads fresh details and updates ID, group, name, symbol, and false base flag', async () => {
    vi.mocked(unitService.get).mockResolvedValueOnce({ ...group, name: 'Fresh group' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit ton"]').trigger('click')
    await flushPromises()
    expect(unitService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh group')
    expect(wrapper.find('[name="is_active"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('[name="symbol"]').setValue('t')
    await wrapper.get('[name="unit_group_id"]').setValue('5')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(unitService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      name: 'Weight',
      symbol: 't',
      unit_group_id: 5,
      is_base: false,
    })
  })
  it.each([true, false])('sends boolean %s from the status modal', async (status) => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for ton"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('ID 1')
    await wrapper.get('[name="is_active"]').setValue(String(status))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(unitService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, { is_active: status })
    expect(unitService.update).not.toHaveBeenCalled()
    expect(unitService.list).toHaveBeenCalledTimes(2)
  })
  it('requires a status when the API omits it', async () => {
    vi.mocked(unitService.get).mockResolvedValueOnce({ ...group, is_active: undefined })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for ton"]').trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Choose the unit status.')
    expect(unitService.toggleActive).not.toHaveBeenCalled()
  })
  it('blocks saving after a detail failure and retries loading', async () => {
    vi.mocked(unitService.get).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit ton"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="name"]').exists()).toBe(true)
  })
  it('preserves input on save failure and prevents duplicate submissions', async () => {
    vi.mocked(unitService.create).mockRejectedValueOnce(new Error('Save failed'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('[name="symbol"]').setValue('t')
    await wrapper.get('[name="unit_group_id"]').setValue('5')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Save failed')
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Weight')
    let done!: () => void
    vi.mocked(unitService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(unitService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('aborts detail loading on dismissal', async () => {
    let done!: (value: typeof group) => void
    vi.mocked(unitService.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit ton"]').trigger('click')
    const signal = vi.mocked(unitService.get).mock.lastCall?.[1]
    await wrapper.get('dialog').trigger('cancel')
    expect(signal?.aborted).toBe(true)
    done(group)
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})

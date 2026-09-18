import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import UnitGroupsView from '../UnitGroupsView.vue'
import { unitGroupService } from '@/services/unit-group.service'
vi.mock('@/services/unit-group.service', () => ({
  unitGroupService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
  },
}))
const group = { id: 1, name: 'ton', is_active: false }
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(UnitGroupsView, { attachTo: document.body })
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
  vi.mocked(unitGroupService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(unitGroupService.get).mockResolvedValue(group)
  vi.mocked(unitGroupService.create).mockResolvedValue(undefined)
  vi.mocked(unitGroupService.update).mockResolvedValue(undefined)
  vi.mocked(unitGroupService.toggleActive).mockResolvedValue(undefined)
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

describe('Unit groups', () => {
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
    expect(unitGroupService.create).not.toHaveBeenCalled()
    await wrapper.get('[name="name"]').setValue(' Weight ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(unitGroupService.create).toHaveBeenCalledExactlyOnceWith({ name: 'Weight' })
    expect(unitGroupService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('loads fresh details and updates only ID and name', async () => {
    vi.mocked(unitGroupService.get).mockResolvedValueOnce({ ...group, name: 'Fresh group' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit ton"]').trigger('click')
    await flushPromises()
    expect(unitGroupService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh group')
    expect(wrapper.find('[name="is_active"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(unitGroupService.update).toHaveBeenCalledExactlyOnceWith({ id: 1, name: 'Weight' })
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
    expect(unitGroupService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, { is_active: status })
    expect(unitGroupService.update).not.toHaveBeenCalled()
    expect(unitGroupService.list).toHaveBeenCalledTimes(2)
  })
  it('requires a status when the API omits it', async () => {
    vi.mocked(unitGroupService.get).mockResolvedValueOnce({ id: 1, name: 'ton' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for ton"]').trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Choose the unit group status.')
    expect(unitGroupService.toggleActive).not.toHaveBeenCalled()
  })
  it('blocks saving after a detail failure and retries loading', async () => {
    vi.mocked(unitGroupService.get).mockRejectedValueOnce(new Error('Unavailable'))
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
    vi.mocked(unitGroupService.create).mockRejectedValueOnce(new Error('Save failed'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Save failed')
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Weight')
    let done!: () => void
    vi.mocked(unitGroupService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(unitGroupService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('aborts detail loading on dismissal', async () => {
    let done!: (value: typeof group) => void
    vi.mocked(unitGroupService.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit ton"]').trigger('click')
    const signal = vi.mocked(unitGroupService.get).mock.lastCall?.[1]
    await wrapper.get('dialog').trigger('cancel')
    expect(signal?.aborted).toBe(true)
    done(group)
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CashbooksView from '../CashbooksView.vue'
import { cashbookService } from '@/services/cashbook.service'
vi.mock('@/services/cashbook.service', () => ({
  cashbookService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
  },
}))
const group = { id: 1, name: 'Kitchen Cashbook', code: 'KITCHEN', type: 'cash', is_active: false }
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(CashbooksView, { attachTo: document.body })
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
  vi.mocked(cashbookService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(cashbookService.get).mockResolvedValue(group)
  vi.mocked(cashbookService.create).mockResolvedValue(undefined)
  vi.mocked(cashbookService.update).mockResolvedValue(undefined)
  vi.mocked(cashbookService.toggleActive).mockResolvedValue(undefined)
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

describe('Cashbooks', () => {
  it('validates a name, creates without ID, and refreshes the table', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Kitchen Cashbook')
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="id"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Name is required.')
    expect(wrapper.get('dialog').text()).toContain('Code is required.')
    expect(cashbookService.create).not.toHaveBeenCalled()
    await wrapper.get('[name="name"]').setValue(' Weight ')
    await wrapper.get('[name="code"]').setValue(' KITCHEN ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(cashbookService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Weight',
      code: 'KITCHEN',
      type: 'cash',
      description: '',
    })
    expect(cashbookService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('requires type and sends the create description without opening balance', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Main Cash')
    await wrapper.get('[name="code"]').setValue('MAIN-CASH')
    await wrapper.get('[name="type"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(cashbookService.create).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').text()).toContain('Type is required.')
    await wrapper.get('[name="type"]').setValue('cash')
    await wrapper.get('[name="description"]').setValue('Main reception cash')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(cashbookService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Main Cash',
      code: 'MAIN-CASH',
      type: 'cash',
      description: 'Main reception cash',
    })
  })
  it('loads fresh details and updates only ID, name, and code', async () => {
    vi.mocked(cashbookService.get).mockResolvedValueOnce({ ...group, name: 'Fresh group' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen Cashbook"]').trigger('click')
    await flushPromises()
    expect(cashbookService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh group')
    expect(wrapper.find('[name="is_active"]').exists()).toBe(false)
    expect(wrapper.find('[name="description"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('[name="code"]').setValue('KITCHEN')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(cashbookService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      name: 'Weight',
      code: 'KITCHEN',
      type: 'cash',
    })
  })
  it.each([true, false])('sends boolean %s from the status modal', async (status) => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Kitchen Cashbook"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('ID 1')
    await wrapper.get('[name="is_active"]').setValue(String(status))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(cashbookService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, { is_active: status })
    expect(cashbookService.update).not.toHaveBeenCalled()
    expect(cashbookService.list).toHaveBeenCalledTimes(2)
  })
  it('requires a status when the API omits it', async () => {
    vi.mocked(cashbookService.get).mockResolvedValueOnce({
      id: 1,
      name: 'Kitchen Cashbook',
      code: 'KITCHEN',
      type: 'cash',
    })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Kitchen Cashbook"]').trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Choose the cashbook status.')
    expect(cashbookService.toggleActive).not.toHaveBeenCalled()
  })
  it('blocks saving after a detail failure and retries loading', async () => {
    vi.mocked(cashbookService.get).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen Cashbook"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="name"]').exists()).toBe(true)
  })
  it('preserves input on save failure and prevents duplicate submissions', async () => {
    vi.mocked(cashbookService.create).mockRejectedValueOnce(new Error('Save failed'))
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
    vi.mocked(cashbookService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(cashbookService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('aborts detail loading on dismissal', async () => {
    let done!: (value: typeof group) => void
    vi.mocked(cashbookService.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen Cashbook"]').trigger('click')
    const signal = vi.mocked(cashbookService.get).mock.lastCall?.[1]
    await wrapper.get('dialog').trigger('cancel')
    expect(signal?.aborted).toBe(true)
    done(group)
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})

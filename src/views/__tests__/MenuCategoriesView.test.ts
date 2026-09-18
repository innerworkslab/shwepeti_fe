import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MenuCategoriesView from '../MenuCategoriesView.vue'
import { menuCategoryService } from '@/services/menu-category.service'
vi.mock('@/services/menu-category.service', () => ({
  menuCategoryService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
  },
}))
const group = {
  id: 1,
  name: 'Kitchen MenuCategory',
  code: 'KITCHEN',
  description: '',
  sort_order: 0,
  is_active: false,
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(MenuCategoriesView, { attachTo: document.body })
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
  vi.mocked(menuCategoryService.list).mockResolvedValue({
    data: [group],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(menuCategoryService.get).mockResolvedValue(group)
  vi.mocked(menuCategoryService.create).mockResolvedValue(undefined)
  vi.mocked(menuCategoryService.update).mockResolvedValue(undefined)
  vi.mocked(menuCategoryService.toggleActive).mockResolvedValue(undefined)
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

describe('MenuCategories', () => {
  it('validates a name, creates without ID, and refreshes the table', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Kitchen MenuCategory')
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="id"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Name is required.')
    expect(wrapper.get('dialog').text()).toContain('Code is required.')
    expect(menuCategoryService.create).not.toHaveBeenCalled()
    await wrapper.get('[name="name"]').setValue(' Weight ')
    await wrapper.get('[name="code"]').setValue(' KITCHEN ')
    await wrapper.get('[name="description"]').setValue('Lunch and dinner menus')
    await wrapper.get('[name="sort_order"]').setValue('10')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(menuCategoryService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Weight',
      code: 'KITCHEN',
      description: 'Lunch and dinner menus',
      sort_order: 10,
    })
    expect(menuCategoryService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it.each(['-1', '1.5', ''])('rejects invalid sort order %s', async (value) => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Lunch')
    await wrapper.get('[name="code"]').setValue('LUNCH')
    await wrapper.get('[name="sort_order"]').setValue(value)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(menuCategoryService.create).not.toHaveBeenCalled()
    expect(wrapper.get('[name="sort_order"]').attributes('aria-invalid')).toBe('true')
  })
  it('loads fresh details and updates only ID, name, and code', async () => {
    vi.mocked(menuCategoryService.get).mockResolvedValueOnce({ ...group, name: 'Fresh group' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen MenuCategory"]').trigger('click')
    await flushPromises()
    expect(menuCategoryService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh group')
    expect(wrapper.find('[name="is_active"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('Weight')
    await wrapper.get('[name="code"]').setValue('KITCHEN')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(menuCategoryService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      name: 'Weight',
      code: 'KITCHEN',
      description: '',
      sort_order: 0,
    })
  })
  it.each([true, false])('sends boolean %s from the status modal', async (status) => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Kitchen MenuCategory"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('ID 1')
    await wrapper.get('[name="is_active"]').setValue(String(status))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(menuCategoryService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, {
      is_active: status,
    })
    expect(menuCategoryService.update).not.toHaveBeenCalled()
    expect(menuCategoryService.list).toHaveBeenCalledTimes(2)
  })
  it('requires a status when the API omits it', async () => {
    vi.mocked(menuCategoryService.get).mockResolvedValueOnce({
      id: 1,
      name: 'Kitchen MenuCategory',
      code: 'KITCHEN',
      description: '',
      sort_order: 0,
    })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Kitchen MenuCategory"]').trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Choose the menu category status.')
    expect(menuCategoryService.toggleActive).not.toHaveBeenCalled()
  })
  it('blocks saving after a detail failure and retries loading', async () => {
    vi.mocked(menuCategoryService.get).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen MenuCategory"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="name"]').exists()).toBe(true)
  })
  it('preserves input on save failure and prevents duplicate submissions', async () => {
    vi.mocked(menuCategoryService.create).mockRejectedValueOnce(new Error('Save failed'))
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
    vi.mocked(menuCategoryService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(menuCategoryService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('dialog').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('aborts detail loading on dismissal', async () => {
    let done!: (value: typeof group) => void
    vi.mocked(menuCategoryService.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Kitchen MenuCategory"]').trigger('click')
    const signal = vi.mocked(menuCategoryService.get).mock.lastCall?.[1]
    await wrapper.get('dialog').trigger('cancel')
    expect(signal?.aborted).toBe(true)
    done(group)
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})

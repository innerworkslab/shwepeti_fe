import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RoomCategoriesView from '../RoomCategoriesView.vue'
import { roomCategoryService } from '@/services/room-category.service'

vi.mock('@/services/room-category.service', () => ({
  roomCategoryService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), toggleActive: vi.fn() },
}))

const category = { id: 1, name: 'Superior Room', description: 'Large room', is_active: false }
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(RoomCategoriesView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
async function openCreate(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.resetAllMocks()
  // jsdom has no native dialog top layer; browsers supply focus containment.
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
  vi.mocked(roomCategoryService.list).mockResolvedValue({
    data: [category],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(roomCategoryService.create).mockResolvedValue(undefined)
  vi.mocked(roomCategoryService.update).mockResolvedValue(undefined)
  vi.mocked(roomCategoryService.toggleActive).mockResolvedValue(undefined)
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  for (const key of ['showModal', 'close']) {
    const descriptor = dialogDescriptors[key]
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
})

describe('room categories', () => {
  it.each([true, false])(
    'updates the selected category status to %s from the pencil action',
    async (status) => {
      const wrapper = render()
      await flushPromises()
      await wrapper.get('[aria-label="Update status for Superior Room"]').trigger('click')
      expect(wrapper.get('dialog').text()).toContain('ID 1')
      expect(wrapper.find('[name="name"]').exists()).toBe(false)
      expect(wrapper.find('[name="description"]').exists()).toBe(false)
      await wrapper.get('[name="is_active"]').setValue(String(status))
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(roomCategoryService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, {
        is_active: status,
      })
      expect(roomCategoryService.update).not.toHaveBeenCalled()
      expect(roomCategoryService.create).not.toHaveBeenCalled()
      expect(wrapper.find('dialog').exists()).toBe(false)
      expect(roomCategoryService.list).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('Room category status updated.')
    },
  )

  it('validates missing status and preserves the status modal after a failed toggle', async () => {
    vi.mocked(roomCategoryService.list).mockResolvedValueOnce({
      data: [{ ...category, is_active: undefined }],
      total: 1,
      page: 1,
      perPage: 20,
    })
    vi.mocked(roomCategoryService.toggleActive).mockRejectedValueOnce(
      new Error('Status update failed.'),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Superior Room"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomCategoryService.toggleActive).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').text()).toContain('Choose the category status.')
    await wrapper.get('[name="is_active"]').setValue('false')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Status update failed.')
    expect(roomCategoryService.list).toHaveBeenCalledTimes(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('loads categories through the shared table and validates before posting', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Superior Room')
    await openCreate(wrapper)
    expect(wrapper.find('[name="id"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Name is required.')
    expect(wrapper.get('dialog').text()).toContain('Description is required.')
    expect(roomCategoryService.create).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(wrapper.get('[name="name"]').element)
  })

  it('creates without an ID or status, trims values, closes, and refreshes', async () => {
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue(' Deluxe ')
    await wrapper.get('[name="description"]').setValue(' Premium room ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomCategoryService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Deluxe',
      description: 'Premium room',
    })
    expect(roomCategoryService.update).not.toHaveBeenCalled()
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(roomCategoryService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Room category created.')
  })

  it('prefills edits and preserves false status with the original ID', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Superior Room"]').trigger('click')
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Superior Room')
    await wrapper.get('[name="name"]').setValue('Premium Deluxe Room')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomCategoryService.update).toHaveBeenCalledExactlyOnceWith({
      ...category,
      name: 'Premium Deluxe Room',
    })
    expect(roomCategoryService.create).not.toHaveBeenCalled()
    expect(roomCategoryService.list).toHaveBeenCalledTimes(2)
  })

  it('requires an explicit status if the list did not return one', async () => {
    vi.mocked(roomCategoryService.list).mockResolvedValueOnce({
      data: [{ ...category, is_active: undefined }],
      total: 1,
      page: 1,
      perPage: 20,
    })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Superior Room"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomCategoryService.update).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').text()).toContain('Choose the category status.')
    await wrapper.get('[name="is_active"]').setValue('true')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomCategoryService.update).toHaveBeenCalledWith({ ...category, is_active: true })
  })

  it('keeps entered data on failure and allows retry', async () => {
    vi.mocked(roomCategoryService.create).mockRejectedValueOnce(
      new Error('Category already exists.'),
    )
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue('Deluxe')
    await wrapper.get('[name="description"]').setValue('Premium room')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Category already exists.')
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Deluxe')
    expect(roomCategoryService.list).toHaveBeenCalledTimes(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('prevents duplicate submissions and closing while saving', async () => {
    let finish!: () => void
    vi.mocked(roomCategoryService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue('Deluxe')
    await wrapper.get('[name="description"]').setValue('Premium room')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(roomCategoryService.create).toHaveBeenCalledTimes(1)
    expect(wrapper.find('dialog').exists()).toBe(true)
    finish()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('clears form state when reopened after cancellation', async () => {
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue('Unsaved')
    await wrapper.get('dialog').trigger('cancel')
    await openCreate(wrapper)
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('')
    expect(roomCategoryService.create).not.toHaveBeenCalled()
  })
})

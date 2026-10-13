import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ItemCategoriesView from '../ItemCategoriesView.vue'
import { itemCategoryService } from '@/services/item-category.service'

vi.mock('@/services/item-category.service', () => ({
  itemCategoryService: {
    list: vi.fn(),
    parentOptions: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
  },
}))

const category = {
  id: 1,
  parent_id: 2,
  name: 'Category One',
  code: 'category_one',
  description: null,
  is_active: false,
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(ItemCategoriesView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
async function openCreate(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(itemCategoryService.parentOptions).mockResolvedValue([
    { ...category, id: 2, parent_id: null },
  ])
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
  vi.mocked(itemCategoryService.list).mockResolvedValue({
    data: [category],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(itemCategoryService.create).mockResolvedValue(undefined)
  vi.mocked(itemCategoryService.update).mockResolvedValue(undefined)
  vi.mocked(itemCategoryService.toggleActive).mockResolvedValue(undefined)
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

describe('item categories', () => {
  it('sends blank optional values as null and validates parent IDs', async () => {
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue('Category One')
    await wrapper.get('[name="code"]').setValue('category_one')
    expect(
      wrapper.findAll('[name="parent_id"] option').map((option) => option.attributes('value')),
    ).toEqual(['', '2'])
    await wrapper.get('[name="parent_id"]').setValue('')
    await wrapper.get('[name="description"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemCategoryService.create).toHaveBeenCalledExactlyOnceWith({
      parent_id: null,
      name: 'Category One',
      code: 'category_one',
      description: null,
    })
  })

  it('rejects self-parenting and allows clearing the parent on update', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Category One"]').trigger('click')
    expect(wrapper.find('[name="is_active"]').exists()).toBe(false)
    await flushPromises()
    expect(
      wrapper.findAll('[name="parent_id"] option').map((option) => option.attributes('value')),
    ).not.toContain('1')
    await wrapper.get('[name="parent_id"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemCategoryService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      parent_id: null,
      name: 'Category One',
      code: 'category_one',
      description: null,
    })
  })

  it.each([true, false])(
    'updates the selected category status to %s from the pencil action',
    async (status) => {
      const wrapper = render()
      await flushPromises()
      await wrapper.get('[aria-label="Update status for Category One"]').trigger('click')
      expect(wrapper.get('dialog').text()).toContain('ID 1')
      expect(wrapper.find('[name="name"]').exists()).toBe(false)
      expect(wrapper.find('[name="description"]').exists()).toBe(false)
      await wrapper.get('[name="is_active"]').setValue(String(status))
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(itemCategoryService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, {
        is_active: status,
      })
      expect(itemCategoryService.update).not.toHaveBeenCalled()
      expect(itemCategoryService.create).not.toHaveBeenCalled()
      expect(wrapper.find('dialog').exists()).toBe(false)
      expect(itemCategoryService.list).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('Item category status updated.')
    },
  )

  it('validates missing status and preserves the status modal after a failed toggle', async () => {
    vi.mocked(itemCategoryService.list).mockResolvedValueOnce({
      data: [{ ...category, is_active: undefined }],
      total: 1,
      page: 1,
      perPage: 20,
    })
    vi.mocked(itemCategoryService.toggleActive).mockRejectedValueOnce(
      new Error('Status update failed.'),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Update status for Category One"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemCategoryService.toggleActive).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').text()).toContain('Choose the category status.')
    await wrapper.get('[name="is_active"]').setValue('false')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Status update failed.')
    expect(itemCategoryService.list).toHaveBeenCalledTimes(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('loads categories through the shared table and validates before posting', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('Category One')
    await openCreate(wrapper)
    expect(wrapper.find('[name="id"]').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Name is required.')
    expect(wrapper.get('dialog').text()).toContain('Code is required.')
    expect(itemCategoryService.create).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(wrapper.get('[name="name"]').element)
  })

  it('creates without an ID or status, trims values, closes, and refreshes', async () => {
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue(' Deluxe ')
    await wrapper.get('[name="code"]').setValue(' category_one ')
    await wrapper.get('[name="description"]').setValue(' Premium room ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemCategoryService.create).toHaveBeenCalledExactlyOnceWith({
      parent_id: null,
      name: 'Deluxe',
      code: 'category_one',
      description: 'Premium room',
    })
    expect(itemCategoryService.update).not.toHaveBeenCalled()
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(itemCategoryService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Item category created.')
  })

  it('prefills edits and sends the original ID without a status field', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Category One"]').trigger('click')
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Category One')
    await wrapper.get('[name="name"]').setValue('Premium Deluxe Room')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(itemCategoryService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      parent_id: 2,
      code: 'category_one',
      description: null,
      name: 'Premium Deluxe Room',
    })
    expect(itemCategoryService.create).not.toHaveBeenCalled()
    expect(itemCategoryService.list).toHaveBeenCalledTimes(2)
  })

  it('keeps entered data on failure and allows retry', async () => {
    vi.mocked(itemCategoryService.create).mockRejectedValueOnce(
      new Error('Category already exists.'),
    )
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue('Deluxe')
    await wrapper.get('[name="code"]').setValue('category_one')
    await wrapper.get('[name="description"]').setValue('Premium room')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Category already exists.')
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Deluxe')
    expect(itemCategoryService.list).toHaveBeenCalledTimes(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('prevents duplicate submissions and closing while saving', async () => {
    let finish!: () => void
    vi.mocked(itemCategoryService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('[name="name"]').setValue('Deluxe')
    await wrapper.get('[name="code"]').setValue('category_one')
    await wrapper.get('[name="description"]').setValue('Premium room')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(itemCategoryService.create).toHaveBeenCalledTimes(1)
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
    expect(itemCategoryService.create).not.toHaveBeenCalled()
  })
})

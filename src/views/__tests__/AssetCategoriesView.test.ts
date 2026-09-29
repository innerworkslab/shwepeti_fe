import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AssetCategoriesView from '../AssetCategoriesView.vue'
import { assetCategoryService } from '@/services/asset-category.service'

vi.mock('@/services/asset-category.service', () => ({
  assetCategoryService: {
    list: vi.fn(),
    get: vi.fn(),
    listOptions: vi.fn(),
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
  const wrapper = mount(AssetCategoriesView, { attachTo: document.body })
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
  vi.mocked(assetCategoryService.list).mockResolvedValue({
    data: [category],
    total: 1,
    page: 1,
    perPage: 20,
  })
  vi.mocked(assetCategoryService.get).mockResolvedValue(category)
  vi.mocked(assetCategoryService.listOptions).mockResolvedValue([
    category,
    { ...category, id: 2, parent_id: null, name: 'Equipment' },
    { ...category, id: 3, parent_id: 1, name: 'Child' },
  ])
  vi.mocked(assetCategoryService.create).mockResolvedValue(undefined)
  vi.mocked(assetCategoryService.update).mockResolvedValue(undefined)
  vi.mocked(assetCategoryService.toggleActive).mockResolvedValue(undefined)
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

describe('asset categories', () => {
  it('validates required fields and creates with null parent and no ID', async () => {
    const wrapper = render()
    await flushPromises()
    await openCreate(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(assetCategoryService.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name is required.')
    expect(wrapper.get('select[name="parent_id"]').text()).toContain('Equipment')
    await wrapper.get('[name="name"]').setValue('Test Asset Category')
    await wrapper.get('[name="code"]').setValue('test_asset_category')
    await wrapper.get('[name="description"]').setValue('Equipment used in the main kitchen')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(assetCategoryService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Test Asset Category',
      code: 'test_asset_category',
      parent_id: null,
      description: 'Equipment used in the main kitchen',
    })
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('loads fresh details, excludes self and descendants, and updates with ID', async () => {
    vi.mocked(assetCategoryService.get).mockResolvedValue({ ...category, name: 'Fresh name' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Category One"]').trigger('click')
    await flushPromises()
    expect(assetCategoryService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh name')
    const select = wrapper.get('select[name="parent_id"]')
    expect(select.find('option[value="1"]').exists()).toBe(false)
    expect(select.find('option[value="3"]').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(assetCategoryService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      parent_id: 2,
      name: 'Fresh name',
      code: 'category_one',
      description: null,
    })
  })
  it('posts boolean false without loading modal parent options', async () => {
    const wrapper = render()
    await flushPromises()
    vi.mocked(assetCategoryService.listOptions).mockClear()
    await wrapper.get('[aria-label="Update status for Category One"]').trigger('click')
    await flushPromises()
    expect(assetCategoryService.listOptions).not.toHaveBeenCalled()
    await wrapper.get('[name="is_active"]').setValue('false')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(assetCategoryService.toggleActive).toHaveBeenCalledExactlyOnceWith(1, {
      is_active: false,
    })
  })
  it('filters by parent and clears it', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[name="parent_filter"]').setValue('2')
    await flushPromises()
    expect(assetCategoryService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, parent_id: 2 }),
      expect.any(AbortSignal),
    )
    await wrapper.get('[name="parent_filter"]').setValue('')
    await flushPromises()
    expect(assetCategoryService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ parent_id: undefined }),
      expect.any(AbortSignal),
    )
  })
  it('blocks saving on detail errors and supports retry', async () => {
    vi.mocked(assetCategoryService.get).mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Category One"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('dialog').text()).toContain('Unavailable')
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})

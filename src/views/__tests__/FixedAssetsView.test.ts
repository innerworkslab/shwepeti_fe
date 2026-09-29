import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FixedAssetsView from '../FixedAssetsView.vue'
import FixedAssetFormView from '../FixedAssetFormView.vue'
import { fixedAssetService } from '@/services/fixed-asset.service'
import { assetCategoryService } from '@/services/asset-category.service'
import { cashbookService } from '@/services/cashbook.service'
vi.mock('@/services/fixed-asset.service', () => ({
  fixedAssetService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
  },
}))
vi.mock('@/services/asset-category.service', () => ({
  assetCategoryService: { listOptions: vi.fn() },
}))
vi.mock('@/services/cashbook.service', () => ({ cashbookService: { listOptions: vi.fn() } }))
const input = {
  asset_code: 'FA-001',
  asset_category_id: 2,
  cashbook_id: 1,
  name: 'Refrigerator',
  serial_number: 'SN-1',
  purchase_date: '2026-09-27 10:00:00',
  purchase_amount: 2500000,
  warranty_expiry_date: '2027-09-27',
  documents: [
    { name: 'Invoice', path: 'https://example.com/invoice.pdf' },
    { name: 'Warranty', path: 'fixed-assets/warranty.pdf' },
  ],
  remark: 'Purchased',
}
const wrappers: ReturnType<typeof mount>[] = []
const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
beforeEach(() => {
  vi.resetAllMocks()
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() {} },
    close: { configurable: true, value() {} },
  })
  vi.mocked(fixedAssetService.list).mockResolvedValue({
    data: [{ id: 10, ...input }],
    page: 1,
    perPage: 15,
    total: 1,
  })
  vi.mocked(fixedAssetService.get).mockResolvedValue({ id: 10, ...input })
  vi.mocked(assetCategoryService.listOptions).mockResolvedValue([
    { id: 2, name: 'Kitchen', code: 'kitchen', parent_id: null, description: null },
  ])
  vi.mocked(cashbookService.listOptions).mockResolvedValue([
    { id: 1, name: 'Cash', code: 'CASH', type: 'cash' },
  ])
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
  for (const key of ['showModal', 'close']) {
    const descriptor = descriptors[key]
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
})
async function render(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/fixed-assets', name: 'fixed-assets', component: FixedAssetsView },
      { path: '/fixed-assets/create', component: FixedAssetFormView },
      { path: '/fixed-assets/:id/edit', component: FixedAssetFormView },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
it('combines filters, rejects reversed dates, and clears filters', async () => {
  const { wrapper } = await render('/fixed-assets')
  await wrapper.get('[name="asset_category_id"]').setValue('2')
  await wrapper.get('[name="cashbook_id"]').setValue('1')
  await wrapper.get('[name="date_from"]').setValue('2026-09-01')
  await wrapper.get('[name="date_to"]').setValue('2026-09-30')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(fixedAssetService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({
      asset_category_id: 2,
      cashbook_id: 1,
      date_from: '2026-09-01',
      date_to: '2026-09-30',
    }),
    expect.any(AbortSignal),
  )
  const count = vi.mocked(fixedAssetService.list).mock.calls.length
  await wrapper.get('[name="date_from"]').setValue('2026-10-01')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(fixedAssetService.list).toHaveBeenCalledTimes(count)
  await wrapper.get('form button[type="button"]').trigger('click')
  await flushPromises()
  expect(fixedAssetService.list).toHaveBeenLastCalledWith(
    expect.objectContaining({
      asset_category_id: undefined,
      cashbook_id: undefined,
      date_from: undefined,
      date_to: undefined,
    }),
    expect.any(AbortSignal),
  )
})
it('loads details, previews document links, removes a document and updates exact payload', async () => {
  const { wrapper, router } = await render('/fixed-assets/10/edit')
  expect(fixedAssetService.get).toHaveBeenCalledWith(10, expect.any(AbortSignal))
  expect(wrapper.get('[aria-label="Preview Invoice"]').attributes('href')).toBe(
    'https://example.com/invoice.pdf',
  )
  await wrapper.get('[aria-label="Remove document 2"]').trigger('click')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(fixedAssetService.update).toHaveBeenCalledExactlyOnceWith({
    id: 10,
    ...input,
    documents: [input.documents[0]],
  })
  expect(router.currentRoute.value.path).toBe('/fixed-assets')
})
it('validates a new asset then creates without an ID', async () => {
  const { wrapper } = await render('/fixed-assets/create')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(fixedAssetService.create).not.toHaveBeenCalled()
  for (const [key, value] of Object.entries(input))
    if (key !== 'documents')
      await wrapper
        .get(`[name="${key}"]`)
        .setValue(key === 'purchase_date' ? String(value).replace(' ', 'T') : String(value))
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(fixedAssetService.create).toHaveBeenCalledExactlyOnceWith({ ...input, documents: [] })
})
it('posts selected status and refreshes', async () => {
  const { wrapper } = await render('/fixed-assets')
  await wrapper.get('[aria-label="Update status for Refrigerator"]').trigger('click')
  await flushPromises()
  await wrapper.get('[name="status"]').setValue('cancelled')
  await wrapper.get('dialog form').trigger('submit')
  await flushPromises()
  expect(fixedAssetService.updateStatus).toHaveBeenCalledExactlyOnceWith(10, {
    status: 'cancelled',
  })
  expect(wrapper.find('dialog').exists()).toBe(false)
})
it('blocks editing after detail failure and retries', async () => {
  vi.mocked(fixedAssetService.get).mockRejectedValueOnce(new Error('Unavailable'))
  const { wrapper } = await render('/fixed-assets/10/edit')
  expect(wrapper.find('form').exists()).toBe(false)
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.find('form').exists()).toBe(true)
})

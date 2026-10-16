import { expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FixedAssetDepreciationsView from '../FixedAssetDepreciationsView.vue'
import { fixedAssetService } from '@/services/fixed-asset.service'
vi.mock('@/services/fixed-asset.service', () => ({ fixedAssetService: { depreciations: vi.fn() } }))
it('shows balances, paginates, and resets the page when the selected asset changes', async () => {
  vi.mocked(fixedAssetService.depreciations).mockImplementation(async (id, params) => ({
    data: [
      {
        id: 3,
        fixed_asset_id: id,
        period: '2026-09',
        amount: '90000.00',
        opening_book_value: '1020000.00',
        closing_book_value: '930000.00',
        created_at: '2026-10-15 14:16:38',
      },
    ],
    page: params?.page ?? 1,
    perPage: 15,
    total: 30,
  }))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/fixed-assets/:id/depreciations', component: FixedAssetDepreciationsView },
      { path: '/fixed-assets', component: { template: '<div />' } },
    ],
  })
  await router.push('/fixed-assets/2/depreciations')
  const w = mount(FixedAssetDepreciationsView, { global: { plugins: [router] } })
  try {
    await flushPromises()
    expect(w.get('tbody').text()).toContain('930000.00')
    expect(w.get('tbody').text()).toContain('1020000.00')
    expect(w.get('tbody').text()).toContain('2026-09')
    await w.get('[aria-label="Next page"]').trigger('click')
    await flushPromises()
    expect(fixedAssetService.depreciations).toHaveBeenLastCalledWith(
      2,
      { page: 2, perPage: 15 },
      expect.any(AbortSignal),
    )
    await router.push('/fixed-assets/5/depreciations')
    await flushPromises()
    expect(fixedAssetService.depreciations).toHaveBeenLastCalledWith(
      5,
      { page: 1, perPage: 15 },
      expect.any(AbortSignal),
    )
  } finally {
    w.unmount()
  }
})

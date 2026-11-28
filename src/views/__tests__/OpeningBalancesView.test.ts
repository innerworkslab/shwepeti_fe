import { it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import View from '../OpeningBalancesView.vue'
import { openingBalanceService as service } from '@/services/opening-balance.service'
const route = reactive({ path: '/opening-balances/items/create' })
const push = vi.fn()
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push }) }))
vi.mock('@/services/opening-balance.service', () => ({ openingBalanceService: { list: vi.fn(), create: vi.fn(), status: vi.fn() } }))
vi.mock('@/services/item.service', () => ({ itemService: { listOptions: async () => [{ id: 10, name: 'Blanket' }] } }))
vi.mock('@/services/cashbook.service', () => ({ cashbookService: { listOptions: async () => [{ id: 1, name: 'Main Cash' }] } }))
vi.mock('@/services/warehouse.service', () => ({ warehouseService: { listOptions: async () => [{ id: 1, name: 'Main' }] } }))
beforeEach(() => { vi.clearAllMocks(); route.path = '/opening-balances/items/create' })
it('creates item opening with selected item and warehouse, calculated total, and no extra fields', async () => {
  const w = mount(View, { props: { kind: 'items' } })
  try {
    await flushPromises()
    await w.get('input[type=date]').setValue('2026-11-28')
    const selects = w.findAll('select')
    await selects[0]!.setValue('10'); await selects[1]!.setValue('1')
    const inputs = w.findAll('input[type=number]')
    await inputs[0]!.setValue('25'); await inputs[1]!.setValue('1200')
    expect(w.get('output').text()).toBe('30,000.00')
    await w.get('form').trigger('submit'); await flushPromises()
    expect(service.create).toHaveBeenCalledWith('items', { date: '2026-11-28', items: [{ item_id: 10, warehouse_id: 1, qty: '25', unit_cost: 1200 }] })
    expect(push).toHaveBeenCalledWith('/opening-balances/items')
  } finally { w.unmount() }
})
it('renders server lines, totals, and offers status only for drafts', async () => {
  route.path = '/opening-balances/cashbooks'
  vi.mocked(service.list).mockResolvedValue({ data: [{ id: 1, reference_no: 'OB-1', date: '2026-11-28', status: 'draft', created_by: 1, cashbooks: [{ cashbook_id: 1, amount: '1500000' }] }, { id: 2, reference_no: 'OB-2', date: '2026-11-28', status: 'confirmed', created_by: 1, cashbooks: [] }], total: 2, page: 1, perPage: 15 })
  const w = mount(View, { props: { kind: 'cashbooks' } })
  try {
    await flushPromises()
    expect(w.text()).toContain('1,500,000.00')
    expect(w.findAll('button[aria-label="Update status"]')).toHaveLength(1)
    await w.get('button[aria-label="Update status"]').trigger('click')
    await w.get('[role=dialog] select').setValue('cancelled')
    await w.get('[role=dialog] form').trigger('submit'); await flushPromises()
    expect(service.status).toHaveBeenCalledWith('cashbooks', 1, 'cancelled')
  } finally { w.unmount() }
})

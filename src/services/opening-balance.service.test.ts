import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from './api/client'
import { openingBalanceService as service } from './opening-balance.service'
import { routePermission } from '@/utils/permissions'
import { mutationPermission } from './api/authorization'
vi.mock('./api/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
describe.each(['cashbooks', 'items'] as const)('%s opening balances', kind => {
  it('normalizes lists and forwards filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 2 }], meta: { current_page: 2, per_page: 15, total: 18, last_page: 2 } } })
    const params = { page: 2, date_from: '2026-11-01', date_to: '2026-11-28' }
    expect(await service.list(kind, params)).toMatchObject({ page: 2, total: 18, data: [{ id: 2 }] })
    expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/admin/opening-balances/${kind}`, { params, signal: undefined })
  })
  it('posts exact draft and status payloads without new permission requirements', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    const payload = { date: '2026-11-28', [kind]: kind === 'cashbooks' ? [{ cashbook_id: 1, amount: 1500000 }] : [{ item_id: 10, warehouse_id: 1, qty: '25', unit_cost: 1200 }] }
    await service.create(kind, payload)
    await service.status(kind, 2, 'confirmed')
    expect(apiClient.post).toHaveBeenNthCalledWith(1, `/api/v1/admin/opening-balances/${kind}`, payload)
    expect(apiClient.post).toHaveBeenNthCalledWith(2, `/api/v1/admin/opening-balances/${kind}/status`, { id: 2, status: 'confirmed' })
    expect(routePermission(`/opening-balances/${kind}/create`)).toBeNull()
    expect(mutationPermission(`/api/v1/admin/opening-balances/${kind}/status`, {})).toBeNull()
    expect(mutationPermission('/api/v1/admin/cashbooks', {})).toBe('cashbooks.create')
  })
  it('surfaces backend failures', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: false, message: 'Already confirmed' } })
    await expect(service.status(kind, 2, 'cancelled')).rejects.toThrow('Already confirmed')
  })
})

import { afterEach, expect, it, vi } from 'vitest'
import { posDashboardService } from '../pos-dashboard.service'
import { posApiClient } from '../api/pos-client'
afterEach(() => vi.restoreAllMocks())
it('requests the POS dashboard with date filters and unwraps its object response', async () => {
  const params = { start_date: '2026-10-01', end_date: '2026-10-01' }
  const data = { ...params, dates: [], room_categories: [] }
  const get = vi
    .spyOn(posApiClient, 'get')
    .mockResolvedValue({ data: { success: true, data, meta: [] } })
  const signal = new AbortController().signal
  expect(await posDashboardService.get(params, signal)).toEqual(data)
  expect(get).toHaveBeenCalledWith('/booking-dashboard', { params, signal })
  get.mockResolvedValueOnce({ data: { success: false, message: 'Unavailable' } })
  await expect(posDashboardService.get(params)).rejects.toThrow('Unavailable')
  get.mockResolvedValueOnce({ data: { success: true, data: [] } })
  await expect(posDashboardService.get(params)).rejects.toThrow('Invalid booking dashboard')
})

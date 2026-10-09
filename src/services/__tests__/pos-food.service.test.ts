import { afterEach, expect, it, vi } from 'vitest'
import { posApiClient } from '../api/pos-client'
import { posFoodService } from '../pos-food.service'
afterEach(() => vi.restoreAllMocks())
it('loads all list pages with the POS client and posts exact endpoints', async () => {
  const get = vi
    .spyOn(posApiClient, 'get')
    .mockResolvedValueOnce({ data: { success: true, data: [{ id: 1 }], meta: { last_page: 2 } } })
    .mockResolvedValueOnce({ data: { success: true, data: [{ id: 2 }], meta: { last_page: 2 } } })
    .mockResolvedValueOnce({ data: { success: true, data: [], meta: [] } })
  expect(await posFoodService.menus()).toEqual([{ id: 1 }, { id: 2 }])
  await posFoodService.orders()
  expect(get).toHaveBeenNthCalledWith(2, '/menus', { signal: undefined, params: { page: 2 } })
  expect(get).toHaveBeenNthCalledWith(3, '/food-orders', { signal: undefined })
  const post = vi
    .spyOn(posApiClient, 'post')
    .mockResolvedValue({ data: { success: true, data: {} } })
  const payload = {
    booking_id: 1,
    room_id: 1,
    items: [{ menu_id: 1, qty: 2, note: '' }],
    discount_amount: 0,
    tax_amount: 0,
    note: '',
  }
  await posFoodService.create(payload)
  await posFoodService.updateStatus(3, 'served')
  expect(post).toHaveBeenNthCalledWith(1, '/food-orders', payload, { signal: undefined })
  expect(post).toHaveBeenNthCalledWith(
    2,
    '/food-orders/3/status',
    { status: 'served' },
    { signal: undefined },
  )
})
it('rejects application errors', async () => {
  vi.spyOn(posApiClient, 'post').mockResolvedValue({
    data: { success: false, message: 'Invalid status' },
  })
  await expect(posFoodService.updateStatus(1, 'cancelled')).rejects.toThrow('Invalid status')
})

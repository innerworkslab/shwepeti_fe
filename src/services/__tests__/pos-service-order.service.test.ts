import { afterEach, expect, it, vi } from 'vitest'
import { posApiClient } from '../api/pos-client'
import { posServiceOrderService } from '../pos-service-order.service'
afterEach(() => vi.restoreAllMocks())
it('uses category query and service status endpoint', async () => {
  const get = vi
    .spyOn(posApiClient, 'get')
    .mockResolvedValue({ data: { success: true, data: [], meta: [] } })
  await posServiceOrderService.items('amenity')
  await posServiceOrderService.items('laundry')
  await posServiceOrderService.orders()
  expect(get).toHaveBeenNthCalledWith(1, '/items', {
    signal: undefined,
    params: { category: 'amenity' },
  })
  expect(get).toHaveBeenNthCalledWith(2, '/items', {
    signal: undefined,
    params: { category: 'laundry' },
  })
  expect(get).toHaveBeenNthCalledWith(3, '/service-orders', { signal: undefined, params: {} })
  const post = vi
    .spyOn(posApiClient, 'post')
    .mockResolvedValue({ data: { success: true, data: {} } })
  await posServiceOrderService.updateStatus(1, 'processing')
  expect(post).toHaveBeenCalledWith(
    '/service-orders/1/status',
    { status: 'processing' },
    { signal: undefined },
  )
})

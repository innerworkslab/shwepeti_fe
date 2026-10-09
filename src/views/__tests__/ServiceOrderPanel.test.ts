import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ServiceOrderPanel from '@/components/pos/ServiceOrderPanel.vue'
import { posServiceOrderService } from '@/services/pos-service-order.service'
vi.mock('@/services/pos-service-order.service', async (original) => ({
  ...(await original<typeof import('@/services/pos-service-order.service')>()),
  posServiceOrderService: {
    items: vi.fn(),
    orders: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}))
afterEach(() => vi.resetAllMocks())
it('uses the category, scopes history, validates and sends a laundry order', async () => {
  vi.mocked(posServiceOrderService.items).mockResolvedValue([
    {
      id: 9,
      name: 'Shirt',
      code: 'SHIRT',
      description: null,
      price: '2000.00',
      is_active: true,
      stock_unit_id: 5,
    },
  ])
  vi.mocked(posServiceOrderService.orders).mockResolvedValue([])
  const w = mount(ServiceOrderPanel, {
    props: { bookingId: 1, roomId: 2, canOrder: true, serviceType: 'laundry' },
  })
  await flushPromises()
  expect(posServiceOrderService.items).toHaveBeenCalledWith('laundry', expect.any(AbortSignal))
  await w.get('[aria-label="Add Shirt"]').trigger('click')
  await w.get('[name="qty-9"]').setValue(0)
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(posServiceOrderService.create).not.toHaveBeenCalled()
  await w.get('[name="qty-9"]').setValue(2)
  await w.get('[name="note-9"]').setValue('Shirts')
  vi.mocked(posServiceOrderService.create).mockResolvedValue({})
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(posServiceOrderService.create).toHaveBeenCalledWith(
    {
      booking_id: 1,
      room_id: 2,
      type: 'laundry',
      items: [{ item_id: 9, qty: 2, note: 'Shirts' }],
      discount_amount: 0,
      tax_amount: 0,
      note: '',
    },
    expect.any(AbortSignal),
  )
  expect(w.text()).toContain('Service order created.')
  w.unmount()
})

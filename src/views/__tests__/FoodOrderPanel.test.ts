import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FoodOrderPanel from '@/components/pos/FoodOrderPanel.vue'
import { posFoodService } from '@/services/pos-food.service'
vi.mock('@/services/pos-food.service', async (original) => ({
  ...(await original<typeof import('@/services/pos-food.service')>()),
  posFoodService: { menus: vi.fn(), orders: vi.fn(), create: vi.fn(), updateStatus: vi.fn() },
}))
const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  vi.resetAllMocks()
})
async function render(canOrder = true) {
  vi.mocked(posFoodService.menus).mockResolvedValue([
    { id: 1, name: 'Rice', price: '1000' },
    { id: 2, name: 'Unavailable', price: 500, is_available: false },
  ])
  vi.mocked(posFoodService.orders).mockResolvedValue([
    { id: 10, booking_id: 3, room_id: 5, status: 'pending' },
    { id: 11, booking_id: 99, room_id: 5, status: 'pending' },
    { id: 12, booking_id: 3, room_id: 99, status: 'pending' },
  ])
  const wrapper = mount(FoodOrderPanel, { props: { bookingId: 3, roomId: 5, canOrder } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
it('scopes orders to the booking and room and submits exact food payload', async () => {
  const w = await render()
  expect(w.text()).toContain('Order #10')
  expect(w.text()).not.toContain('Order #11')
  expect(w.text()).not.toContain('Order #12')
  expect(w.text()).not.toContain('Unavailable')
  await w.get('[aria-label="Add Rice"]').trigger('click')
  await w.get('[name="qty-1"]').setValue(2)
  await w.get('[name="note-1"]').setValue('Less spicy')
  await w.get('[name="note"]').setValue('Send to room')
  vi.mocked(posFoodService.create).mockResolvedValue({ id: 13 })
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(posFoodService.create).toHaveBeenCalledWith(
    {
      booking_id: 3,
      room_id: 5,
      items: [{ menu_id: 1, qty: 2, note: 'Less spicy' }],
      discount_amount: 0,
      tax_percentage: 0,
      service_charge_percentage: 0,
      service_charge_amount: 0,
      tax_amount: 0,
      note: 'Send to room',
    },
    expect.any(AbortSignal),
  )
  expect(w.text()).toContain('Food order created.')
  expect(w.find('[name="qty-1"]').exists()).toBe(false)
})
it('rejects bad quantities and preserves cart after backend failure', async () => {
  const w = await render()
  await w.get('[aria-label="Add Rice"]').trigger('click')
  await w.get('[name="qty-1"]').setValue(0)
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(posFoodService.create).not.toHaveBeenCalled()
  await w.get('[name="qty-1"]').setValue(1)
  vi.mocked(posFoodService.create).mockRejectedValue(new Error('Out of stock'))
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(w.text()).toContain('Out of stock')
  expect(w.find('[name="qty-1"]').exists()).toBe(true)
})
it('updates order status, and hides ordering for closed bookings', async () => {
  const w = await render(false)
  expect(w.find('form').exists()).toBe(false)
  await w.get('[aria-label="Status for order 10"]').setValue('preparing')
  vi.mocked(posFoodService.updateStatus).mockResolvedValue({})
  await w
    .findAll('button')
    .find((b) => b.text() === 'Update')!
    .trigger('click')
  await flushPromises()
  expect(posFoodService.updateStatus).toHaveBeenCalledWith(10, 'preparing', expect.any(AbortSignal))
})

it.each(['served', 'cancelled'])('locks a %s order against status updates', async (status) => {
  const w = await render()
  vi.mocked(posFoodService.orders).mockResolvedValue([
    { id: 10, booking_id: 3, room_id: 5, status },
  ])
  await w.get('[aria-label="Refresh food orders"]').trigger('click')
  await flushPromises()
  expect(w.get('[aria-label="Status for order 10"]').attributes('disabled')).toBeDefined()
  expect(
    w
      .findAll('button')
      .find((b) => b.text() === 'Update')!
      .attributes('disabled'),
  ).toBeDefined()
  expect(posFoodService.updateStatus).not.toHaveBeenCalled()
})

it('recalculates read-only charges from quantities and discounted subtotal', async () => {
  const w = await render()
  await w.get('[aria-label="Add Rice"]').trigger('click')
  await w.get('[name="qty-1"]').setValue(2)
  await w.get('[name="discount_amount"]').setValue(200)
  await w.get('[name="tax_percentage"]').setValue(5)
  await w.get('[name="service_charge_percentage"]').setValue(10)
  expect((w.get('[name="tax_amount"]').element as HTMLInputElement).value).toBe('90')
  expect((w.get('[name="service_charge_amount"]').element as HTMLInputElement).value).toBe('180')
  expect(w.get('[name="tax_amount"]').attributes('readonly')).toBeDefined()
  expect(w.get('[name="service_charge_amount"]').attributes('readonly')).toBeDefined()
  vi.mocked(posFoodService.create).mockResolvedValue({ id: 20 })
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(posFoodService.create).toHaveBeenCalledWith(
    expect.objectContaining({
      tax_percentage: 5,
      tax_amount: 90,
      service_charge_percentage: 10,
      service_charge_amount: 180,
    }),
    expect.any(AbortSignal),
  )
})

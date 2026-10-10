import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PosLayout from '@/layouts/PosLayout.vue'
import PosBookingsView from '../PosBookingsView.vue'
import PosBookingDetailView from '../PosBookingDetailView.vue'
import { posBookingService } from '@/services/pos-booking.service'
import type { PosBookingDetail } from '@/types/pos-booking'
vi.mock('@/services/pos-booking.service', () => ({
  posBookingService: { list: vi.fn(), get: vi.fn() },
}))
const booking = {
  id: 1,
  booking_no: 'BK-1',
  guest_name: 'Guest',
  booking_type: 'reservation',
  charge_type: 'day',
  status: 'reserved',
  room_id: 1,
  room: { name: 'Room 101', status: 'reserved', price: '45000.00' },
  total_amount: '45000.00',
  paid_amount: '30000.00',
  balance_amount: '15000.00',
  payments: [
    {
      id: 1,
      payment_no: 'BP-1',
      payment_type: 'deposit',
      payment_method: 'cash',
      amount: '30000.00',
      paid_at: '2026-10-07 10:00:00',
      note: 'Deposit',
    },
  ],
} as PosBookingDetail
const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.restoreAllMocks()
})
async function render(path: string) {
  vi.mocked(posBookingService.list).mockResolvedValue([booking])
  vi.mocked(posBookingService.get).mockResolvedValue(booking)
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false
      },
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/pos',
        component: PosLayout,
        children: [
          { path: '', component: { template: '<p>Terminal</p>' } },
          { path: 'bookings', component: PosBookingsView },
          { path: 'bookings/:id', component: PosBookingDetailView },
        ],
      },
    ],
  })
  await router.push(path)
  const w = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  wrappers.push(w)
  await flushPromises()
  return { w, router }
}
it('starts navigation closed and closes it after selecting Bookings', async () => {
  const { w } = await render('/pos')
  expect((w.get('dialog').element as HTMLDialogElement).open).toBe(false)
  await w.get('[aria-label="Open POS navigation"]').trigger('click')
  expect((w.get('dialog').element as HTMLDialogElement).open).toBe(true)
  await w.get('nav a[href="/pos/bookings"]').trigger('click')
  await flushPromises()
  expect((w.get('dialog').element as HTMLDialogElement).open).toBe(false)
  expect(w.text()).toContain('BK-1')
  await w.get('a[href="/pos/bookings/1"]').trigger('click')
  await flushPromises()
  expect(posBookingService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  expect(w.text()).toContain('BP-1')
  expect(w.text()).toContain('15000.00')
})
it('rejects invalid detail ids and displays request errors with retry', async () => {
  const { w, router } = await render('/pos/bookings/nope')
  expect(w.text()).toContain('Invalid booking ID.')
  vi.mocked(posBookingService.get).mockRejectedValueOnce(new Error('Booking unavailable'))
  await router.push('/pos/bookings/2')
  await flushPromises()
  expect(w.text()).toContain('Booking unavailable')
  await w
    .findAll('button')
    .find((b) => b.text() === 'Retry')!
    .trigger('click')
  await flushPromises()
  expect(w.text()).toContain('BK-1')
})

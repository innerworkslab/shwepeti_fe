import { posCashbookService } from '@/services/pos-cashbook.service'
vi.mock('@/services/pos-cashbook.service', () => ({ posCashbookService: { list: vi.fn() } }))
import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BookingActions from '@/components/pos/BookingActions.vue'
import { posBookingService } from '@/services/pos-booking.service'
vi.mock('@/services/pos-booking.service', () => ({
  posBookingService: { get: vi.fn(), checkIn: vi.fn(), checkout: vi.fn(), partialPayment: vi.fn() },
}))
afterEach(() => vi.resetAllMocks())
it.each(['partial', 'checkout'] as const)('validates and submits %s payment', async (mode) => {
  vi.mocked(posBookingService.get).mockResolvedValue({
    id: 1,
    status: 'checked_in',
    total_amount: '45000.00',
    paid_amount: '30000.00',
    balance_amount: '15000.00',
  } as never)
  vi.mocked(posCashbookService.list).mockResolvedValue([
    { id: 1, name: 'Main Cash', code: 'MAIN-CASH' },
  ] as never)
  const w = mount(BookingActions, { props: { bookingId: 1, disabled: false } })
  await flushPromises()
  await w
    .findAll('button')
    .find((b) => b.text() === (mode === 'partial' ? 'Partial payment' : 'Check out'))!
    .trigger('click')
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(posBookingService.checkout).not.toHaveBeenCalled()
  expect(posBookingService.partialPayment).not.toHaveBeenCalled()
  await w.get('[name="cashbook_id"]').setValue('1')
  await w.get('[name="amount"]').setValue('15000')
  await w.get('[name="paid_at"]').setValue('2026-10-08T12:00')
  await w.get('[name="payment_method"]').setValue('kpay')
  await w.get('[name="note"]').setValue('Payment')
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(
    mode === 'partial' ? posBookingService.partialPayment : posBookingService.checkout,
  ).toHaveBeenCalledWith(
    1,
    {
      cashbook_id: 1,
      amount: 15000,
      paid_at: '2026-10-08 12:00:00',
      payment_method: 'kpay',
      note: 'Payment',
    },
    expect.any(AbortSignal),
  )
  expect(w.emitted('saved')).toHaveLength(1)
  w.unmount()
})
it('checks in a reserved booking and retains errors on failure', async () => {
  vi.mocked(posBookingService.get).mockResolvedValue({ id: 1, status: 'reserved' } as never)
  vi.mocked(posBookingService.checkIn).mockRejectedValue(new Error('Room unavailable'))
  vi.mocked(posCashbookService.list).mockResolvedValue([
    { id: 1, name: 'Main Cash', code: 'MAIN-CASH' },
  ] as never)
  const w = mount(BookingActions, { props: { bookingId: 1, disabled: false } })
  await flushPromises()
  await w
    .findAll('button')
    .find((b) => b.text() === 'Check in')!
    .trigger('click')
  await flushPromises()
  expect(posBookingService.checkIn).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  expect(w.text()).toContain('Room unavailable')
  expect(w.emitted('saved')).toBeUndefined()
  w.unmount()
})

import { afterEach, expect, it, vi } from 'vitest'
import { bookingPayload } from '@/schemas/pos-booking.schema'
import { posBookingService } from '../pos-booking.service'
import { posApiClient } from '../api/pos-client'
const form = {
  room_id: '5',
  booking_type: 'reservation',
  guest_name: ' Mg Mg ',
  charge_type: 'day',
  expected_check_in_at: '2026-10-07T20:00',
  expected_check_out_at: '2026-10-08T12:00',
  session_hours: '',
  session_rate: '',
  note: 'bookings',
  include_deposit: false,
}
afterEach(() => vi.restoreAllMocks())
it('posts the exact day reservation payload with no optional deposit or UI fields', async () => {
  const payload = await bookingPayload(form)
  expect(payload).toEqual({
    room_id: 5,
    booking_type: 'reservation',
    guest_name: 'Mg Mg',
    charge_type: 'day',
    expected_check_in_at: '2026-10-07 20:00:00',
    expected_check_out_at: '2026-10-08 12:00:00',
    session_hours: null,
    session_rate: null,
    note: 'bookings',
  })
  const result = { id: 4, booking_no: 'BK-4' }
  const post = vi
    .spyOn(posApiClient, 'post')
    .mockResolvedValue({ data: { success: true, data: result } })
  const signal = new AbortController().signal
  expect(await posBookingService.create(payload, signal)).toEqual(result)
  expect(post).toHaveBeenCalledWith('/bookings', payload, { signal })
})
it('includes a validated reservation deposit but strips it for walk-ins', async () => {
  const deposit = {
    cashbook_id: 1,
    amount: '20000',
    payment_method: 'ayapay',
    paid_at: '2026-10-07T20:00',
    note: 'Deposit',
  }
  expect((await bookingPayload({ ...form, include_deposit: true, deposit })).deposit).toEqual({
    ...deposit,
    amount: 20000,
    paid_at: '2026-10-07 20:00:00',
  })
  const walkIn = await bookingPayload({
    ...form,
    booking_type: 'walk_in',
    charge_type: 'session',
    session_hours: '3',
    session_rate: '25000',
    include_deposit: true,
    deposit,
  })
  expect(walkIn).toMatchObject({ session_hours: 3, session_rate: 25000 })
  expect(walkIn).not.toHaveProperty('deposit')
})
it('rejects invalid date ordering, missing session amounts and invalid deposits', async () => {
  await expect(
    bookingPayload({ ...form, expected_check_out_at: form.expected_check_in_at }),
  ).rejects.toThrow('Check-out')
  await expect(
    bookingPayload({ ...form, expected_check_in_at: '2026-02-30T12:00' }),
  ).rejects.toThrow()
  await expect(bookingPayload({ ...form, charge_type: 'session' })).rejects.toThrow()
  await expect(
    bookingPayload({ ...form, include_deposit: true, deposit: { amount: -1 } }),
  ).rejects.toThrow()
})
it('surfaces application failures', async () => {
  vi.spyOn(posApiClient, 'post').mockResolvedValue({
    data: { success: false, message: 'Room already reserved.' },
  })
  await expect(posBookingService.create(await bookingPayload(form))).rejects.toThrow(
    'Room already reserved.',
  )
})

it('uses bodyless check-in and exact checkout/partial payment payloads', async () => {
  const post = vi.spyOn(posApiClient, 'post').mockResolvedValue({ data: { success: true } })
  const payload = {
    cashbook_id: 1,
    payment_method: 'kpay' as const,
    amount: 15000,
    paid_at: '2026-10-08 12:00:00',
    note: 'Final payment',
  }
  await posBookingService.checkIn(1)
  const checkout = {
    ...payload,
    tax_percentage: 0,
    tax_amount: 0,
    service_charge_percentage: 0,
    service_charge_amount: 0,
  }
  await posBookingService.checkout(1, checkout)
  await posBookingService.partialPayment(1, { ...payload, cashbook_id: 1 })
  expect(post).toHaveBeenNthCalledWith(1, '/bookings/1/check-in', undefined, { signal: undefined })
  expect(post).toHaveBeenNthCalledWith(2, '/bookings/1/checkout', checkout, { signal: undefined })
  expect(post).toHaveBeenNthCalledWith(
    3,
    '/bookings/1/payments',
    { ...payload, cashbook_id: 1, payment_type: 'partial' },
    { signal: undefined },
  )
})

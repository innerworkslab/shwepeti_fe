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
    subtotal: '45000.00',
    discount_amount: '0.00',
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
  if (mode === 'checkout') {
    await w.get('[name="tax_percentage"]').setValue(5)
    await w.get('[name="service_charge_percentage"]').setValue(10)
    expect(w.get('[name="tax_amount"]').attributes('readonly')).toBeDefined()
    expect((w.get('[name="amount"]').element as HTMLInputElement).value).toBe('21750')
  } else await w.get('[name="amount"]').setValue('15000')
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
      amount: mode === 'checkout' ? 21750 : 15000,
      paid_at: '2026-10-08 12:00:00',
      payment_method: 'kpay',
      note: 'Payment',
      ...(mode === 'checkout'
        ? {
            tax_percentage: 5,
            tax_amount: 2250,
            service_charge_percentage: 10,
            service_charge_amount: 4500,
          }
        : {}),
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

it.each([false, true])(
  'automatically checks out a paid booking and safely retries failures (%s)',
  async (fails) => {
    const initial = {
      id: 1,
      status: 'checked_in',
      subtotal: '100',
      discount_amount: '0',
      total_amount: '115',
      paid_amount: '15',
      balance_amount: '100',
      tax_percentage: 5,
      tax_amount: '5',
      service_charge_percentage: 10,
      service_charge_amount: '10',
    }
    vi.mocked(posBookingService.get)
      .mockResolvedValueOnce(initial as never)
      .mockResolvedValue({ ...initial, paid_amount: '115', balance_amount: '0' } as never)
    vi.mocked(posCashbookService.list).mockResolvedValue([
      { id: 1, name: 'Cash', code: 'CASH' },
    ] as never)
    if (fails)
      vi.mocked(posBookingService.checkout)
        .mockRejectedValueOnce(new Error('Try later'))
        .mockResolvedValue(undefined)
    const w = mount(BookingActions, { props: { bookingId: 1, disabled: false } })
    try {
      await flushPromises()
      await w
        .findAll('button')
        .find((b) => b.text() === 'Partial payment')!
        .trigger('click')
      await flushPromises()
      await w.get('[name="cashbook_id"]').setValue('1')
      await w.get('[name="amount"]').setValue('100')
      await w.get('[name="paid_at"]').setValue('2026-10-20T10:00')
      await w.get('[name="payment_method"]').setValue('kpay')
      await w.get('[name="note"]').setValue('Settled')
      await w.get('form').trigger('submit')
      await flushPromises()
      expect(posBookingService.checkout).toHaveBeenCalledWith(
        1,
        {
          cashbook_id: 1,
          payment_method: 'kpay',
          amount: 0,
          paid_at: '2026-10-20 10:00:00',
          note: 'Settled',
          tax_percentage: 5,
          tax_amount: 5,
          service_charge_percentage: 10,
          service_charge_amount: 10,
        },
        expect.any(AbortSignal),
      )
      if (fails) {
        expect(w.text()).toContain('Payment was recorded')
        expect(w.emitted('saved')).toBeUndefined()
        await w
          .findAll('button')
          .find((b) => b.text() === 'Retry payment completion')!
          .trigger('click')
        await flushPromises()
        expect(posBookingService.checkout).toHaveBeenCalledTimes(2)
      }
      expect(posBookingService.partialPayment).toHaveBeenCalledTimes(1)
      expect(w.emitted('saved')).toHaveLength(1)
    } finally {
      w.unmount()
    }
  },
)

it('uses refreshed room invoice amounts even when booking details still have older totals', async () => {
  vi.mocked(posBookingService.get).mockResolvedValue({
    id: 1,
    status: 'checked_in',
    subtotal: '100',
    total_amount: '100',
    tax_amount: '0',
    paid_amount: '0',
    balance_amount: '100',
  } as never)
  const w = mount(BookingActions, {
    props: {
      bookingId: 1,
      disabled: false,
      roomBooking: { id: 1, total_amount: '150.00', tax_amount: '15.00' },
    },
  })
  try {
    await flushPromises()
    expect(w.text()).toContain('150.00')
    expect(w.text()).toContain('15.00')
    await w.setProps({
      refreshKey: 1,
      roomBooking: { id: 1, total_amount: '275.00', tax_amount: '25.00', balance_amount: '0.00' },
    })
    await flushPromises()
    expect(w.text()).toContain('275.00')
    expect(w.text()).toContain('25.00')
    expect(w.text()).not.toContain('150.00')
  } finally {
    w.unmount()
  }
})
